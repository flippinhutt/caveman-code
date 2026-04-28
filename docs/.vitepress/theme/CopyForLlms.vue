<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vitepress";

// "Copy for LLMs" — pulls the rendered article text, estimates a token count
// (chars/4 heuristic, fine for budgeting), copies plain text to clipboard.
// Hooked into doc-before slot via VitePress override.

const route = useRoute();
const status = ref<"idle" | "copying" | "done" | "fail">("idle");
const tokens = ref<number>(0);

function estimateTokens(s: string): number {
    return Math.ceil(s.trim().length / 4);
}

function getArticleText(): string {
    if (typeof document === "undefined") return "";
    const article = document.querySelector(".VPDoc .content-container");
    if (!article) return "";
    return (article as HTMLElement).innerText || "";
}

async function copy() {
    status.value = "copying";
    const text = getArticleText();
    tokens.value = estimateTokens(text);
    try {
        await navigator.clipboard.writeText(text);
        status.value = "done";
        setTimeout(() => (status.value = "idle"), 2000);
    } catch {
        status.value = "fail";
        setTimeout(() => (status.value = "idle"), 2000);
    }
}

onMounted(() => {
    tokens.value = estimateTokens(getArticleText());
});
</script>

<template>
    <button
        type="button"
        class="copy-for-llms"
        :title="`Copy this page as plain text for an LLM (~${tokens} tokens)`"
        @click="copy"
    >
        <span v-if="status === 'idle'">Copy for LLMs (~{{ tokens }} tok)</span>
        <span v-else-if="status === 'copying'">Copying…</span>
        <span v-else-if="status === 'done'">Copied</span>
        <span v-else>Copy failed</span>
    </button>
</template>

<style scoped>
.copy-for-llms {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.7rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: 6px;
    background: var(--vp-c-bg-soft);
    color: var(--vp-c-text-2);
    font-size: 12px;
    font-family: var(--vp-font-family-mono);
    cursor: pointer;
    transition: all 0.15s ease;
}
.copy-for-llms:hover {
    background: var(--vp-c-bg-mute);
    color: var(--vp-c-text-1);
    border-color: var(--vp-c-brand-1);
}
</style>
