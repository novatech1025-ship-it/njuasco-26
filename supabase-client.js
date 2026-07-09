"use strict";

(function () {
  const config = window.NJUASCO_SUPABASE || {};
  const bucket = "admission-documents";

  function sdk() {
    if (!window.supabase?.createClient || !config.url || !config.anonKey) return null;
    if (!window.__njuascoSupabase) {
      window.__njuascoSupabase = window.supabase.createClient(config.url, config.anonKey);
    }
    return window.__njuascoSupabase;
  }

  function dataUrlToBlob(dataUrl) {
    const [header, data] = String(dataUrl || "").split(",");
    const mime = /data:([^;]+)/.exec(header || "")?.[1] || "application/octet-stream";
    const raw = atob(data || "");
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function appToRow(app) {
    return {
      ref: app.ref,
      first_name: app.firstName || "",
      last_name: app.lastName || "",
      name: app.name,
      dob: app.dob || null,
      gender: app.gender || "",
      address: app.address || "",
      phone: app.phone || "",
      previous_school: app.school || "",
      bece_index: app.beceIndex || "",
      bece_year: app.beceYear ? Number(app.beceYear) : null,
      aggregate: app.aggregate ? Number(app.aggregate) : null,
      programme: app.programme,
      guardian_name: app.guardianName || "",
      guardian_relation: app.guardianRelation || "",
      guardian_phone: app.guardianPhone || "",
      guardian_email: app.guardianEmail || "",
      guardian_occupation: app.guardianOccupation || "",
      status: app.status || "submitted",
      stage: app.stage || "Application submitted",
      timeline: app.timeline || [],
    };
  }

  function rowToApp(row, documents = []) {
    return {
      id: row.id,
      ref: row.ref,
      name: row.name,
      firstName: row.first_name,
      lastName: row.last_name,
      dob: row.dob,
      gender: row.gender,
      address: row.address,
      phone: row.phone,
      programme: row.programme,
      status: row.status,
      stage: row.stage,
      date: row.created_at || row.updated_at,
      aggregate: row.aggregate,
      beceIndex: row.bece_index,
      beceYear: row.bece_year,
      school: row.previous_school,
      guardianName: row.guardian_name,
      guardianPhone: row.guardian_phone,
      guardianEmail: row.guardian_email,
      guardianRelation: row.guardian_relation,
      guardianOccupation: row.guardian_occupation,
      decisionNote: row.decision_note,
      decisionDate: row.decision_date,
      timeline: row.timeline || [],
      documents,
    };
  }

  async function submitApplication(app) {
    const client = sdk();
    if (!client) return null;

    const { data: row, error } = await client
      .from("admission_applications")
      .insert(appToRow(app))
      .select("*")
      .single();
    if (error) throw error;

    const rows = [];
    for (const doc of app.documents || []) {
      if (!doc.data?.startsWith("data:")) continue;
      const path = `${row.id}/${doc.type}-${Date.now()}-${doc.name}`;
      const { error: uploadError } = await client.storage
        .from(bucket)
        .upload(path, dataUrlToBlob(doc.data), {
          contentType: doc.mime || "application/octet-stream",
          upsert: true,
        });
      if (uploadError) throw uploadError;
      rows.push({
        application_id: row.id,
        document_type: doc.type,
        label: doc.label,
        file_name: doc.name,
        mime_type: doc.mime,
        file_size: doc.size,
        storage_path: path,
      });
    }

    if (rows.length) {
      const { error: docError } = await client.from("admission_documents").insert(rows);
      if (docError) throw docError;
    }

    return rowToApp(row, rows.map((doc) => ({ ...doc, name: doc.file_name })));
  }

  async function findApplicationByRef(ref) {
    const client = sdk();
    if (!client) return null;
    const { data: row, error } = await client
      .from("admission_applications")
      .select("*")
      .eq("ref", ref)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;

    const { data: docs } = await client
      .from("admission_documents")
      .select("*")
      .eq("application_id", row.id);
    return rowToApp(row, docs || []);
  }

  window.NJUASCO_SUPABASE_CLIENT = {
    isReady: () => Boolean(sdk()),
    submitApplication,
    findApplicationByRef,
  };
})();

