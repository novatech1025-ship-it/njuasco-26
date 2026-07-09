// NJUASCO Shared Navigation - loaded on every page
window.NJUASCO_CURRENT_PAGE = window.NJUASCO_CURRENT_PAGE || "home";

// Check if portal coming soon mode is enabled and redirect if necessary
function checkPortalComingSoon() {
  try {
    const info = JSON.parse(localStorage.getItem("nj_info") || "{}");
    if (info.portalComingSoon === true) {
      // List of portal pages that should be redirected
      const portalPages = [
        "student-portal.html",
        "teacher-portal.html",
        "parent-portal.html",
        "alumni-portal.html",
        "portal-hub.html",
      ];
      const currentPage = window.location.pathname.split("/").pop();
      if (portalPages.includes(currentPage)) {
        window.location.href = "coming-soon.html";
      }
    }
  } catch (e) {}
}

// Run check on page load
document.addEventListener("DOMContentLoaded", () => {
  checkPortalComingSoon();
  if (DB?.syncRemoteInfo) {
    DB.syncRemoteInfo().then((remoteInfo) => {
      if (remoteInfo) {
        checkPortalComingSoon();
      }
    });
  }
  if (DB?.subscribeRemoteInfo) {
    DB.subscribeRemoteInfo((info) => {
      const portalPages = [
        "student-portal.html",
        "teacher-portal.html",
        "parent-portal.html",
        "alumni-portal.html",
        "portal-hub.html",
      ];
      const currentPage = window.location.pathname.split("/").pop();
      if (info.portalComingSoon === true && portalPages.includes(currentPage)) {
        window.location.href = "coming-soon.html";
      }
      if (currentPage === "coming-soon.html" && info.portalComingSoon !== true) {
        window.location.href = "portal-hub.html";
      }
    });
  }
});
// Also run immediately in case page hasn't fully loaded
checkPortalComingSoon();

window.addEventListener("storage", function (event) {
  if (event.key !== "nj_info") return;
  try {
    const info = JSON.parse(event.newValue || "{}");
    const portalPages = [
      "student-portal.html",
      "teacher-portal.html",
      "parent-portal.html",
      "alumni-portal.html",
      "portal-hub.html",
    ];
    const currentPage = window.location.pathname.split("/").pop();
    if (info.portalComingSoon === true && portalPages.includes(currentPage)) {
      window.location.href = "coming-soon.html";
    }
    if (currentPage === "coming-soon.html" && info.portalComingSoon !== true) {
      window.location.href = "portal-hub.html";
    }
  } catch (e) {
    // ignore invalid updates
  }
});

function go(pg) {
  const map = {
    home: "index.html",
    about: "about.html",
    academics: "academics.html",
    admissions: "admissions.html",
    apply: "apply.html",
    "admission-status": "admission-status.html",
    news: "news.html",
    gallery: "gallery.html",
    documents: "documents.html",
    facilities: "facilities.html",
    clubs: "clubs.html",
    contact: "contact.html",
    donate: "donate.html",
    "portal-hub": "portal-hub.html",
    "student-portal": "student-portal.html",
    "teacher-portal": "teacher-portal.html",
    "parent-portal": "parent-portal.html",
    "alumni-portal": "alumni-portal.html",
    njosa: "njosa.html",
    shop: "shop.html",
    cart: "cart.html",
    checkout: "checkout.html",
    "sub-admin": "sub-admin.html",
    staff: "staff.html",
  };
  const url = map[pg];
  if (url) window.location.href = url;
}

// Cart badge update
function updateCartBadge() {
  try {
    const cart = JSON.parse(localStorage.getItem("nj_cart") || "[]");
    const total = cart.reduce((s, i) => s + (i.qty || 1), 0);
    document.querySelectorAll(".cart-badge").forEach((el) => {
      el.textContent = total;
      el.style.display = total > 0 ? "flex" : "none";
    });
  } catch (e) {}
}

document.addEventListener("DOMContentLoaded", updateCartBadge);

