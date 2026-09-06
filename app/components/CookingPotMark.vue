<script setup lang="ts">
// The lid is its own path so it can lift and tilt. It simmers away on its own,
// and hovering holds it open.
const hovered = ref(false)
</script>

<template>
  <span
    class="pot"
    :class="{ 'is-hovered': hovered }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <g class="pot-steam">
        <path d="M8 3.5c0-1 1-1 1-2" />
        <path d="M12 3c0-1 1-1 1-2" />
        <path d="M16 3.5c0-1 1-1 1-2" />
      </g>
      <g class="pot-lid">
        <path d="M3 9h18" />
      </g>
      <path d="M5 9v6a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5V9" />
      <path d="M2 11h1M21 11h1" />
    </svg>
  </span>
</template>

<style scoped>
.pot {
  display: inline-grid;
  place-items: center;
  width: 1em;
  height: 1em;
}

.pot svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.pot-lid {
  transform-origin: 50% 45%;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: pot-simmer 4s ease-in-out infinite;
}

.pot.is-hovered .pot-lid {
  animation: none;
  transform: translateY(-2.5px) rotate(-11deg);
}

.pot-steam path {
  opacity: 0;
  animation: pot-steam 4s ease-in-out infinite;
}

.pot-steam path:nth-child(2) {
  animation-delay: 0.4s;
}

.pot-steam path:nth-child(3) {
  animation-delay: 0.8s;
}

.pot.is-hovered .pot-steam path {
  animation-duration: 1.6s;
}

/* The lid lifts and settles, the way a pot knocks as it comes to the boil. */
@keyframes pot-simmer {
  0%,
  55%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  62% {
    transform: translateY(-2px) rotate(-8deg);
  }
  70% {
    transform: translateY(-0.5px) rotate(-3deg);
  }
  78% {
    transform: translateY(-1.5px) rotate(-6deg);
  }
}

@keyframes pot-steam {
  0%,
  50% {
    opacity: 0;
    transform: translateY(1.5px);
  }
  65% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: translateY(-2.5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pot-lid,
  .pot-steam path {
    transition: none;
    animation: none;
  }

  .pot.is-hovered .pot-lid {
    transform: translateY(-2.5px) rotate(-11deg);
  }

  .pot.is-hovered .pot-steam path {
    opacity: 0.85;
  }
}
</style>
