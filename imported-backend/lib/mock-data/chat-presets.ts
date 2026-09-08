// Preset Chat Lore Packs for VYBZ // ARCADE SYSTEM
import { TopQuote } from "@/types/api";

export interface ChatPreset {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  participants: string[];
  participantRoles: Record<string, string>;
  messageCount: number;
  topQuotes: TopQuote[];
  rawChatText: string;
}

export const CHAT_PRESETS: ChatPreset[] = [
  {
    id: "hackathon-night",
    title: "HACKATHON ALL-NIGHTER",
    subtitle: "DEV DISCORD // 142 MESSAGES",
    badge: "ROM // 001 COMPATIBLE",
    description: "3 AM caffeine crashes, broken router arguments, pizza fights, and fighting Next.js schemas.",
    participants: ["Nishant", "Kabir", "Sneha", "Dev", "Arjun", "Riya"],
    participantRoles: {
      Nishant: "LORE ARCHIVIST // CHAT HISTORIAN",
      Kabir: "CHAOS OPERATOR // SHITPOSTER",
      Sneha: "AUX TYRANT // 14-MIN TRACKS",
      Dev: "SERIAL CONTRARIAN // DEBATER",
      Arjun: "3AM VOICE NOTE PHILOSOPHER",
      Riya: "VOICE OF REASON // MEDIATOR",
    },
    messageCount: 142,
    topQuotes: [
      { author: "Nishant", text: "guys are we actually doing the hackathon tonight", timestamp: "18:05" },
      { author: "Sneha", text: "and somehow we spent 3 hours arguing about the logo", timestamp: "18:17" },
      { author: "Arjun", text: "listen to my 4-minute voice note explaining our vision", timestamp: "18:35" },
      { author: "Dev", text: "last time you had aux we listened to french vaporwave for 90 minutes", timestamp: "18:47" },
      { author: "Kabir", text: "the cable fell behind the radiator", timestamp: "18:53" },
      { author: "Sneha", text: "git push --force is my love language", timestamp: "20:12" },
      { author: "Nishant", text: "half pineapple half jalapeño chaos edition", timestamp: "19:12" },
      { author: "Kabir", text: "I listened to 12 seconds and heard a microwave beeping", timestamp: "18:38" },
      { author: "Dev", text: "screenshots are permanent Kabir", timestamp: "20:30" },
      { author: "Riya", text: "did anyone actually register our team on Devpost", timestamp: "18:25" },
    ],
    rawChatText: `[06/09/26, 18:05] Nishant: guys are we actually doing the hackathon tonight
[06/09/26, 18:11] Riya: you said that last night too
[06/09/26, 18:14] Kabir: last night we were supposed to plan
[06/09/26, 18:17] Sneha: and somehow we spent 3 hours arguing about the logo
[06/09/26, 18:20] Dev: the logo was important
[06/09/26, 18:21] Nishant: the logo was NOT important we had no backend
[06/09/26, 18:23] Arjun: we literally have no database schema
[06/09/26, 18:25] Riya: did anyone actually register our team on Devpost
[06/09/26, 18:26] Kabir: thought Nishant did that
[06/09/26, 18:35] Arjun: listen to my 4-minute voice note explaining our vision
[06/09/26, 18:36] Riya: nobody is listening to a 4 minute voice note Arjun
[06/09/26, 18:38] Kabir: I listened to 12 seconds and heard a microwave beeping
[06/09/26, 18:45] Sneha: as long as I control the playlist we are good
[06/09/26, 18:47] Dev: last time you had aux we listened to french vaporwave for 90 minutes
[06/09/26, 18:50] Kabir: bro my phone died for 6 hours yesterday so don't blame me
[06/09/26, 18:53] Kabir: the cable fell behind the radiator
[06/09/26, 20:12] Sneha: git push --force is my love language
[06/09/26, 20:30] Dev: screenshots are permanent Kabir`,
  },
  {
    id: "goa-roadtrip",
    title: "GOA ROAD TRIP 2024",
    subtitle: "WHATSAPP GROUP // 189 MESSAGES",
    badge: "AUX CORD CONFLICTS",
    description: "Missed flights, rented scooters with no brakes, beach shack tab disputes, and aux cord dictators.",
    participants: ["Alex", "Maya", "Sam", "Liam", "Chloe"],
    participantRoles: {
      Alex: "THE AUX TYRANT // DJ OVERLORD",
      Maya: "LORE KEEPER // RECEIPT HOARDER",
      Sam: "VOICE NOTE POET // OVEREXPLAINER",
      Liam: "SERIAL CONTRARIAN // SLEEP-THROUGH-ALARM",
      Chloe: "TRIP ACCOUNTANT // SPLITWISE COP",
    },
    messageCount: 189,
    topQuotes: [
      { author: "Alex", text: "I literally told you guys not to touch the aux cord five minutes ago", timestamp: "14:32" },
      { author: "Maya", text: "I have timestamps proving Liam was asleep when the bill came", timestamp: "16:45" },
      { author: "Sam", text: "listen to this 8-minute voice note on why South Goa has better spiritual energy", timestamp: "09:12" },
      { author: "Liam", text: "bro the scooter was making that metallic scraping sound before I rented it", timestamp: "12:04" },
      { author: "Chloe", text: "whoever ordered four extra mocktails needs to settle Splitwise right now", timestamp: "23:19" },
      { author: "Alex", text: "if anyone skips this 11-minute guitar solo we are walking", timestamp: "15:02" },
      { author: "Liam", text: "my alarm definitely went off, the phone was on silent though", timestamp: "10:40" },
      { author: "Maya", text: "I recorded Alex singing off-key at the beach cafe for future blackmail", timestamp: "21:05" },
    ],
    rawChatText: `[12/04/24, 09:12] Sam: listen to this 8-minute voice note on why South Goa has better spiritual energy
[12/04/24, 10:40] Liam: my alarm definitely went off, the phone was on silent though
[12/04/24, 12:04] Liam: bro the scooter was making that metallic scraping sound before I rented it
[12/04/24, 14:32] Alex: I literally told you guys not to touch the aux cord five minutes ago
[12/04/24, 15:02] Alex: if anyone skips this 11-minute guitar solo we are walking
[12/04/24, 16:45] Maya: I have timestamps proving Liam was asleep when the bill came
[12/04/24, 21:05] Maya: I recorded Alex singing off-key at the beach cafe for future blackmail
[12/04/24, 23:19] Chloe: whoever ordered four extra mocktails needs to settle Splitwise right now`,
  },
  {
    id: "roommates-lore",
    title: "APARTMENT 404 CHRONICLES",
    subtitle: "DORM CHAT // 230 MESSAGES",
    badge: "MYSTERY DISHES // WIFI WARS",
    description: "Who drank the oat milk, unwashed frying pans, 3 AM microwave beeping, and router resets.",
    participants: ["Jordan", "Taylor", "Morgan", "Chris"],
    participantRoles: {
      Jordan: "CLEANLINESS ENFORCER // CHORE CZAR",
      Taylor: "THE 3AM CHEF // NOISE MAKER",
      Morgan: "WIFI WHISPERER // BANDWIDTH THIEF",
      Chris: "PHANTOM TENANT // DISAPPEARING ACT",
    },
    messageCount: 230,
    topQuotes: [
      { author: "Jordan", text: "there is a pan in the sink that has officially developed its own ecosystem", timestamp: "11:20" },
      { author: "Taylor", text: "I was cooking caramelized onions at 3:15 AM it requires patience", timestamp: "03:45" },
      { author: "Morgan", text: "if everyone stops streaming 4K maybe my zoom call will stop lagging", timestamp: "19:04" },
      { author: "Chris", text: "I haven't been in the apartment since Tuesday that wasn't my milk", timestamp: "14:15" },
      { author: "Jordan", text: "the label on the milk literally had your handwriting Chris", timestamp: "14:18" },
      { author: "Morgan", text: "who turned off the router power strip to charge their electric toothbrush", timestamp: "20:50" },
      { author: "Taylor", text: "leaving dirty dishes to soak is a valid scientific cleaning method", timestamp: "12:02" },
      { author: "Jordan", text: "it has been soaking for five business days", timestamp: "12:03" },
    ],
    rawChatText: `[15/02/25, 03:45] Taylor: I was cooking caramelized onions at 3:15 AM it requires patience
[15/02/25, 11:20] Jordan: there is a pan in the sink that has officially developed its own ecosystem
[15/02/25, 12:02] Taylor: leaving dirty dishes to soak is a valid scientific cleaning method
[15/02/25, 12:03] Jordan: it has been soaking for five business days
[15/02/25, 14:15] Chris: I haven't been in the apartment since Tuesday that wasn't my milk
[15/02/25, 14:18] Jordan: the label on the milk literally had your handwriting Chris
[15/02/25, 19:04] Morgan: if everyone stops streaming 4K maybe my zoom call will stop lagging
[15/02/25, 20:50] Morgan: who turned off the router power strip to charge their electric toothbrush`,
  },
];
