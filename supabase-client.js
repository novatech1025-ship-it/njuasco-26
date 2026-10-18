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

  async function submitApplication(app) {
    const client = sdk();
    if (!client) return null;

    const applicationId = crypto.randomUUID();
    const { error } = await client
      .from("admission_applications")
      .insert({ id: applicationId, ...appToRow(app) });
    if (error) throw error;

    const rows = [];
    for (const doc of app.documents || []) {
      if (!doc.data?.startsWith("data:")) continue;
      const fileName = String(doc.name || "upload").replace(/[^\w.-]/g, "_").slice(0, 120);
      const path = `${applicationId}/${doc.type}-${Date.now()}-${fileName}`;
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

    return { ...app, id: applicationId };
  }

  async function findApplicationByRef(ref, dob = "") {
    const client = sdk();
    if (!client) return null;
    const { data, error } = await client.functions.invoke("admission-status", {
      body: { ref, dob },
    });
    if (error) throw error;
    if (!data?.application) return null;
    return {
      ref: data.application.ref,
      programme: data.application.programme,
      status: data.application.status,
      date: data.application.date,
      documentCount: data.application.documentCount,
    };
  }

  window.NJUASCO_SUPABASE_CLIENT = {
    isReady: () => Boolean(sdk()),
    submitApplication,
    findApplicationByRef,
  };
})();
