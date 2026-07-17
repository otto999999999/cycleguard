"use client"

type MuscleStatus = "fresh" | "recovery" | "ready"

type MuscleBodyMapProps = {
  side: "front" | "back"
  getStatusForGroup: (group: string) => MuscleStatus
}

type MusclePart = {
  key: string
  label: string
  group: string
  src: string
}

const frontParts: MusclePart[] = [
  {
    key: "neck",
    label: "Nacken",
    group: "Nacken",
    src: "/muscles/front/neck",
  },
  {
    key: "front-delts",
    label: "Vordere Schulter",
    group: "Vordere Schulter",
    src: "/muscles/front/front-delts",
  },
  {
    key: "side-delts",
    label: "Seitliche Schulter",
    group: "Seitliche Schulter",
    src: "/muscles/front/side-delts",
  },
  {
    key: "chest",
    label: "Brust",
    group: "Brust",
    src: "/muscles/front/chest",
  },
  {
    key: "abs",
    label: "Bauch",
    group: "Bauch",
    src: "/muscles/front/abs",
  },
  {
    key: "biceps",
    label: "Bizeps",
    group: "Bizeps",
    src: "/muscles/front/biceps",
  },
  {
    key: "forearms",
    label: "Unterarme",
    group: "Griffkraft",
    src: "/muscles/front/forearms",
  },
  {
    key: "quads",
    label: "Quadrizeps",
    group: "Quadrizeps",
    src: "/muscles/front/quads",
  },
  {
    key: "calves",
    label: "Waden",
    group: "Waden",
    src: "/muscles/front/calves",
  },
]

const backParts: MusclePart[] = [
  {
    key: "neck",
    label: "Nacken",
    group: "Nacken",
    src: "/muscles/back/neck",
  },
  {
    key: "rear-delts",
    label: "Hintere Schulter",
    group: "Hintere Schulter",
    src: "/muscles/back/rear-delts",
  },
  {
    key: "side-delts",
    label: "Seitliche Schulter",
    group: "Seitliche Schulter",
    src: "/muscles/back/side-delts",
  },
  {
    key: "triceps",
    label: "Trizeps",
    group: "Trizeps",
    src: "/muscles/back/triceps",
  },
  {
    key: "lats",
    label: "Rücken",
    group: "Rücken",
    src: "/muscles/back/lats",
  },
  {
    key: "lower-back",
    label: "Unterer Rücken",
    group: "Unterer Rücken",
    src: "/muscles/back/lower-back",
  },
  {
    key: "glutes",
    label: "Glutes",
    group: "Glutes",
    src: "/muscles/back/glutes",
  },
  {
    key: "quads",
    label: "Quadrizeps",
    group: "Quadrizeps",
    src: "/muscles/back/quads",
  },
  {
    key: "calves",
    label: "Waden",
    group: "Waden",
    src: "/muscles/back/calves",
  },
  {
    key: "forearms",
    label: "Unterarme",
    group: "Griffkraft",
    src: "/muscles/back/forearms",
  },
]

const getLayerClass = (status: MuscleStatus) => {
  if (status === "fresh") {
    return "opacity-100 drop-shadow-[0_0_16px_rgba(34,211,238,0.85)]"
  }

  if (status === "recovery") {
    return "opacity-85 drop-shadow-[0_0_14px_rgba(59,130,246,0.75)]"
  }

  return "opacity-28"
}

export default function MuscleBodyMap({
  side,
  getStatusForGroup,
}: MuscleBodyMapProps) {
  const baseSrc =
    side === "front" ? "/muscles/front/base.png" : "/muscles/back/base.png"

  const parts = side === "front" ? frontParts : backParts

  return (
    <div className="rounded-[30px] border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.02] px-3 pt-4 pb-5">
      <p className="mb-3 text-center text-sm font-black text-white/70">
        {side === "front" ? "Vorne" : "Hinten"}
      </p>

<div className="relative mx-auto h-[330px] w-full max-w-[170px] overflow-hidden rounded-[24px] border border-white/10 bg-black sm:h-[500px] sm:max-w-[240px] sm:rounded-[28px]">
  <div className="absolute inset-0 scale-[2.05] translate-y-[4px] sm:scale-[1.85] sm:translate-y-[12px]">
    <img
      src={baseSrc}
      alt={side === "front" ? "Körper Vorderseite" : "Körper Rückseite"}
      className="absolute inset-0 z-10 h-full w-full object-contain"
    />

    {parts.map((part) => {
      const status = getStatusForGroup(part.group)

      return (
        <img
          key={part.key}
          src={`${part.src}/${status}.png`}
          alt={part.label}
          className={`absolute inset-0 z-20 h-full w-full object-contain mix-blend-lighten transition-all duration-300 ${getLayerClass(
            status
          )}`}
          onError={(event) => {
            event.currentTarget.style.display = "none"
          }}
        />
      )
    })}
  </div>

  <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-white/[0.08] via-transparent to-black/20" />
</div>
    </div>
  )
}