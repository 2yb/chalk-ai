import { createVisualActions } from "@/lib/lesson-visuals";
import type {
  GeneratedLessonSegment,
  Lesson,
} from "@/schemas/lesson.schema";

interface DemoLessonDefinition {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  topic: string;
  introduction: string;
  estimatedDurationSeconds: number;
  learningObjectives: string[];
  segments: GeneratedLessonSegment[];
}

export interface DemoLessonCard {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  lesson: Lesson;
}

const demoDefinitions: DemoLessonDefinition[] = [
  {
    id: "water-cycle",
    title: "The Water Cycle",
    description: "Follow one drop through Earth's atmosphere.",
    keywords: ["water cycle", "evaporation", "precipitation", "clouds"],
    topic: "How does the water cycle work?",
    introduction:
      "Water is always moving between the ground, oceans, and atmosphere. Follow one drop to see how sunlight, clouds, and gravity keep the cycle going.",
    estimatedDurationSeconds: 120,
    learningObjectives: [
      "Explain evaporation and condensation",
      "Describe how precipitation returns water to Earth",
      "Connect the stages into one continuous cycle",
    ],
    segments: [
      {
        id: "sunlight",
        heading: "Sunlight starts the journey",
        narration:
          "The water cycle is powered mainly by the Sun. Its energy warms oceans, lakes, and wet ground. Some liquid water gains enough energy to become invisible water vapor, which rises into the air. This change from liquid to gas is called evaporation.",
        visualType: "arrow",
        visualCue: "Sun warms water",
      },
      {
        id: "vapor",
        heading: "Vapor rises and cools",
        narration:
          "Warm air can hold more water vapor than cool air. As vapor rises, the surrounding air gets colder. Tiny amounts of water begin to gather around microscopic particles such as dust. The vapor is changing back into liquid droplets, a process called condensation.",
        visualType: "circle",
        visualCue: "Cooling droplets",
      },
      {
        id: "clouds",
        heading: "Droplets build clouds",
        narration:
          "A cloud is made of countless tiny droplets or ice crystals suspended in air. Each one is too small to fall quickly. Winds move clouds across the sky, carrying stored water far from the ocean or lake where much of it first evaporated.",
        visualType: "rectangle",
        visualCue: "Cloud of droplets",
      },
      {
        id: "rain",
        heading: "Water falls back down",
        narration:
          "Droplets collide and combine inside clouds. When they grow heavy enough, gravity pulls them down as precipitation. It may fall as rain, snow, sleet, or hail, depending on the temperature of the air along the way to the ground.",
        visualType: "arrow",
        visualCue: "Cloud to ground",
      },
      {
        id: "collection",
        heading: "Land and oceans collect water",
        narration:
          "After reaching the surface, water can flow over land into streams and rivers. Some soaks into soil and becomes groundwater, while some is taken up by plants. Eventually, much of this water returns to lakes and oceans, ready to move again.",
        visualType: "text",
        visualCue: "Flow and collect",
      },
      {
        id: "cycle",
        heading: "One connected system",
        narration:
          "The stages are not a one-way checklist. Water can evaporate, condense, fall, freeze, melt, or travel underground in different orders. The key idea is continuous movement: energy from the Sun lifts water, and gravity brings it back toward Earth's surface.",
        visualType: "circle",
        visualCue: "Repeat the cycle",
      },
    ],
  },
  {
    id: "black-holes",
    title: "How Black Holes Work",
    description: "Explore gravity, event horizons, and light.",
    keywords: ["black hole", "black holes", "event horizon", "gravity", "space"],
    topic: "How do black holes work?",
    introduction:
      "A black hole is a region where matter is packed so densely that gravity becomes extreme. Let’s see how one forms and why its boundary matters.",
    estimatedDurationSeconds: 120,
    learningObjectives: [
      "Describe how a black hole can form",
      "Explain the event horizon",
      "Understand why black holes do not act like cosmic vacuum cleaners",
    ],
    segments: [
      {
        id: "gravity",
        heading: "Gravity shapes space",
        narration:
          "Gravity is the attraction between things that have mass. Every star bends the space around it, and nearby objects respond to that curve. A black hole forms when a large amount of matter is compressed into such a small region that the bending becomes extraordinarily strong.",
        visualType: "circle",
        visualCue: "Mass bends space",
      },
      {
        id: "collapse",
        heading: "A massive star collapses",
        narration:
          "A massive star shines because fusion in its core pushes outward while gravity pulls inward. When the fuel runs low, that outward support weakens. If the remaining core is heavy enough, gravity wins and the core collapses, creating a compact object with intense gravity.",
        visualType: "arrow",
        visualCue: "Star collapses inward",
      },
      {
        id: "boundary",
        heading: "The event horizon",
        narration:
          "Around a black hole is a boundary called the event horizon. It is not a solid surface. Instead, it marks the point of no return: once something crosses inward, escaping would require moving faster than light, which nature does not allow.",
        visualType: "circle",
        visualCue: "Point of no return",
      },
      {
        id: "light",
        heading: "Why it looks black",
        narration:
          "Light carries information to our eyes and telescopes. Beyond the event horizon, light cannot travel back out, so the hole itself appears dark. Astronomers can still detect nearby hot gas, whose glow and motion reveal the invisible object.",
        visualType: "rectangle",
        visualCue: "Bright gas nearby",
      },
      {
        id: "orbit",
        heading: "Orbits still follow gravity",
        narration:
          "A black hole is not a cosmic vacuum cleaner that pulls in everything nearby. From far away, its gravity behaves like that of any object with the same mass. Matter can orbit safely if it stays far enough away and has the right speed.",
        visualType: "arrow",
        visualCue: "Stable matter orbit",
      },
      {
        id: "evidence",
        heading: "How we find them",
        narration:
          "We study black holes by observing their effects. Stars may orbit an unseen massive companion, or hot gas may spiral inward and shine brightly. Gravitational waves from colliding black holes provide another signal. Different observations help test the same picture of extreme gravity.",
        visualType: "text",
        visualCue: "Observe their effects",
      },
    ],
  },
  {
    id: "flight",
    title: "Why Airplanes Fly",
    description: "See how wings, thrust, and balance work together.",
    keywords: ["airplane", "airplanes", "aircraft", "flight", "lift", "wings"],
    topic: "Why do airplanes fly?",
    introduction:
      "An airplane stays in the air because four forces work together. We’ll follow the airflow around a wing, then connect lift to thrust, drag, and weight.",
    estimatedDurationSeconds: 120,
    learningObjectives: [
      "Name the four forces acting on an airplane",
      "Explain how a wing redirects air to create lift",
      "Describe how pilots balance forces during flight",
    ],
    segments: [
      {
        id: "forces",
        heading: "Four forces act on a plane",
        narration:
          "In flight, an airplane experiences lift upward, weight downward, thrust forward, and drag backward. Flight is not about turning gravity off. It is about balancing these forces: lift can support the plane's weight while thrust helps overcome the air resistance called drag.",
        visualType: "text",
        visualCue: "Lift weight thrust drag",
      },
      {
        id: "wing",
        heading: "Wings meet moving air",
        narration:
          "As an airplane moves forward, air flows around each wing. The wing's shape and its angle to the oncoming air guide that flow. A wing is not simply a curved surface that magically sucks a plane upward; the full airflow and pressure pattern matter.",
        visualType: "rectangle",
        visualCue: "Wing meets airflow",
      },
      {
        id: "airflow",
        heading: "The wing redirects air",
        narration:
          "A wing pushes air downward as it travels through the atmosphere. By Newton's third law, the redirected air pushes the wing upward in response. Pressure differences across the wing also contribute to lift. These descriptions fit together as parts of one physical interaction.",
        visualType: "arrow",
        visualCue: "Air pushed downward",
      },
      {
        id: "speed",
        heading: "Speed changes lift",
        narration:
          "Faster airflow over the wing generally means more lift, provided the pilot keeps a suitable angle. During takeoff, engines provide thrust to increase speed. The wings then produce enough lift for the airplane to rise, while the pilot controls how quickly and steeply it climbs.",
        visualType: "arrow",
        visualCue: "Speed builds lift",
      },
      {
        id: "balance",
        heading: "Cruising is balanced flight",
        narration:
          "In steady, level cruising, lift approximately balances weight, and thrust approximately balances drag. If the pilot changes speed, pitch, or wing angle, those balances shift. The airplane may climb, descend, accelerate, or slow down until a new flight condition is reached.",
        visualType: "circle",
        visualCue: "Balance in cruise",
      },
      {
        id: "control",
        heading: "Controls guide the forces",
        narration:
          "Ailerons help roll the airplane, the elevator changes its pitch, and the rudder helps control yaw. Together with engine power, these controls let pilots steer and manage the forces. Airplanes fly because wings interact with air, while engines and controls keep that interaction useful.",
        visualType: "text",
        visualCue: "Pilot guides flight",
      },
    ],
  },
];

export const DEMO_LESSONS: DemoLessonCard[] = demoDefinitions.map((definition) => {
  const lesson: Lesson = {
    title: definition.title,
    topic: definition.topic,
    introduction: definition.introduction,
    estimatedDurationSeconds: definition.estimatedDurationSeconds,
    learningObjectives: definition.learningObjectives,
    segments: definition.segments.map((segment, index) => ({
      id: `${definition.id}-${segment.id}`,
      heading: segment.heading,
      narration: segment.narration,
      visuals: createVisualActions(segment, index),
    })),
  };

  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    keywords: definition.keywords,
    lesson,
  };
});

export function getDemoLessonForTopic(topic: string): Lesson | null {
  const normalizedTopic = topic.trim().toLowerCase();
  const matchingDemo = DEMO_LESSONS.find((demo) =>
    demo.keywords.some((keyword) => normalizedTopic.includes(keyword)),
  );
  return matchingDemo?.lesson ?? null;
}
