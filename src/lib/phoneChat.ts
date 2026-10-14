// Lets any CTA on the page (e.g. "Let's talk") jump to the phone in WorksSection and open its iMessage chat.
export const OPEN_PHONE_CHAT = 'open-phone-chat';

export const openPhoneChat = () => window.dispatchEvent(new Event(OPEN_PHONE_CHAT));
