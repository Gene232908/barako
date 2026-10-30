import type React from 'react';

// Lets any CTA on the page (e.g. "Let's talk") jump to the phone in WorksSection and open its iMessage chat.
export const OPEN_PHONE_CHAT = 'open-phone-chat';

export const openPhoneChat = () => window.dispatchEvent(new Event(OPEN_PHONE_CHAT));

// "Contact" links (navbar, menu, footer) skip the #contact anchor and open the phone chat instead.
export const CONTACT_HREF = '#contact';

export const onContactClick = (e: React.MouseEvent) => {
  e.preventDefault();
  openPhoneChat();
};
