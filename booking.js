// Booking links come from content/salon.yml (scripts/salon.js). Each is a normal
// new-tab link; on wider screens, embeddable Google pages open in the panel instead.
import { lang } from "./i18n.js";

const dialog = document.querySelector("[data-booking]");
const frame = dialog?.querySelector("[data-booking-frame]");
const title = dialog?.querySelector(".booking-title");
const tab = dialog?.querySelector("[data-booking-tab]");
// Google's calendar is cramped when framed on a phone.
const wide = matchMedia("(min-width: 701px)");

for (const link of document.querySelectorAll("[data-book][data-embed]")) {
  link.addEventListener("click", (e) => {
    if (!dialog?.showModal || !wide.matches) return;
    e.preventDefault();
    // data-text-* lets i18n.js retitle the panel if the language changes while it is open.
    for (const l of ["en", "ja"]) title.setAttribute(`data-text-${l}`, link.getAttribute(`data-name-${l}`));
    title.textContent = link.getAttribute(`data-name-${lang}`);
    tab.href = link.href;
    if (frame.src !== link.dataset.embed) frame.src = link.dataset.embed;
    dialog.showModal();
  });
}

dialog?.querySelector("[data-booking-close]").addEventListener("click", () => dialog.close());
// A click on the backdrop lands on the dialog itself.
dialog?.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
