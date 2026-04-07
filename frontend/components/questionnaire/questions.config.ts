// components/questionnaire/questions.config.ts

export type QuestionConfig =
  | {
      type: "radio";
      key: string;
      question: string;
      subtitle?: string;
      options: { label: string; subtitle?: string }[];
    }
  | {
      type: "slider";
      key: string;
      question: string;
      subtitle?: string;
      min: number;
      max: number;
    };

export const QUESTIONS: QuestionConfig[] = [
  // Q1 — First preferred position
  {
    type: "radio",
    key: "pos1",
    question: "What is your FIRST preferred position?",
    options: [
      { label: "Setter" },
      { label: "Outside Hitter" },
      { label: "Middle Blocker" },
      { label: "Opposite" },
      { label: "Libero" },
    ],
  },
  // Q2 — Second preferred position
  {
    type: "radio",
    key: "pos2",
    question: "What is your SECOND preferred position?",
    options: [
      { label: "Setter" },
      { label: "Outside Hitter" },
      { label: "Middle Blocker" },
      { label: "Opposite" },
      { label: "Libero" },
    ],
  },
  // Q3 — Third preferred position
  {
    type: "radio",
    key: "pos3",
    question: "What is your THIRD preferred position?",
    options: [
      { label: "Setter" },
      { label: "Outside Hitter" },
      { label: "Middle Blocker" },
      { label: "Opposite" },
      { label: "Libero" },
    ],
  },

  // Q4 — Experience
  {
    type: "radio",
    key: "experience",
    question: "How long have you been playing volleyball?",
    options: [
      { label: "Less than 3 months" },
      { label: "3-6 months" },
      { label: "6 months - 1 year" },
      { label: "1-3 years" },
      { label: "More than 3 years" },
    ],
  },

  // Q5 — Frequency
  {
    type: "radio",
    key: "often",
    question: "How often do you usually play volleyball?",
    subtitle: "Select the option that best describes your monthly frequency.",
    options: [
      { label: "Once a month or less", subtitle: "I've only played casually or for fun" },
      { label: "1-2 times per month" },
      { label: "3-4 times per month" },
      { label: "5-6 times per month" },
      { label: "7-8 times per month" },
      { label: "9-10 times per month" },
      { label: "11-12 times per month" },
      { label: "13-14 times per month" },
      { label: "15-16 times per month" },
      { label: "17-18 times per month" },
      { label: "More than 18 times per month" },
    ],
  },

  // Q6 — Competitive history
  {
    type: "radio",
    key: "uni_team",
    question: "Have you ever played for a team, school, or university?",
    options: [
      { label: "Never", subtitle: "I've only played casually or for fun" },
      { label: "Previously", subtitle: "I used to play but I'm not active currently" },
      { label: "Currently playing", subtitle: "I am an active member of a volleyball team" },
    ],
  },

  // Q7 — Endurance
  {
    type: "radio",
    key: "intensity",
    question: "How long can you play volleyball at your preferred intensity?",
    options: [
      { label: "< 15 minutes" },
      { label: "15-30 minutes" },
      { label: "30-60 minutes" },
      { label: "60-90 minutes" },
      { label: "90+ minutes" },
    ],
  },

  // Q8 — Rule knowledge
  {
    type: "slider",
    key: "rule",
    question: "How confident are you in your knowledge of the game rules?",
    subtitle:
      "Use the slider to indicate your familiarity with volleyball regulations and officiating.",
    min: 0,
    max: 10,
  },

  // Q9 — Serving accuracy
  {
    type: "slider",
    key: "serve",
    question: "If you serve 10 balls, how many do you think will go in?",
    subtitle: "This helps us estimate your current serve consistency.",
    min: 0,
    max: 10,
  },

  // Q10 — Receiving serves
  {
    type: "slider",
    key: "serve_receive",
    question: "How confident are you in receiving serves?",
    subtitle: "Select a rating from 0 (Not confident) to 10 (Very confident).",
    min: 0,
    max: 10,
  },

  // Q11 — Receiving spikes
  {
    type: "slider",
    key: "spike_receive",
    question: "How confident are you in receiving spikes?",
    subtitle: "Select a rating from 0 (Not confident) to 10 (Very confident).",
    min: 0,
    max: 10,
  },

  // Q12 — Setting
  {
    type: "slider",
    key: "set",
    question: "How confident are you in setting?",
    subtitle: "Select a rating from 0 (Not confident) to 10 (Very confident).",
    min: 0,
    max: 10,
  },

  // Q13 — Spiking
  {
    type: "slider",
    key: "spike",
    question: "How confident are you in spiking?",
    subtitle: "Select a rating from 0 (Not confident) to 10 (Very confident).",
    min: 0,
    max: 10,
  },

  // Q14 — Blocking
  {
    type: "slider",
    key: "block",
    question: "How confident are you in blocking?",
    subtitle: "Select a rating from 0 (Not confident) to 10 (Very confident).",
    min: 0,
    max: 10,
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length; // 11