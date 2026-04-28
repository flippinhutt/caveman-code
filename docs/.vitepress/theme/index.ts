import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import CopyForLlms from "./CopyForLlms.vue";
import "./custom.css";

// Cave VitePress theme.
// Adds:
//  - "Copy for LLMs" button on every doc page (slot: doc-before)
//  - Token-counted body that strips frontmatter + nav, copies plain markdown
//  - Theme tweaks in custom.css
const theme: Theme = {
    ...DefaultTheme,
    enhanceApp({ app }) {
        app.component("CopyForLlms", CopyForLlms);
    },
    Layout: DefaultTheme.Layout,
};

export default theme;
