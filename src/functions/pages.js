// Páginas dinâmicas do sistema
import { main } from "../pages/mainPage.js";
import { dashboard } from "../pages/dashboard.js";
import { matches } from "../pages/matches.js";
import { chat } from "../pages/chat.js";
import { profile } from "../pages/profile.js";
import { admin } from "../pages/admin.js";

export const page = {
    mainPage: main,
    dashboard,
    matches,
    chat,
    profile,
    admin
};