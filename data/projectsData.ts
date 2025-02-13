interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: 'Theai',
    description: `Theia provides visual assistance to the visually impaired. 
  It is designed to provide answers to the user's questions about the world around them.
    Theia can do almost anything when it comes to providing visual assistance, reading your bills, detecting known faces around you, 
    checking the traffic lights, detecting obstactles around you and more.`,
    imgSrc: '/static/images/theai.png',
    href: 'https://devpost.com/software/cap',
  },
  {
    title: 'Hygia - Opiod Addiction Recovery',
    description: `Walking to work, past the same streets where heroin once ruled your life, the craving still lingers. Then, a buzz—“You can do this.” Hygia’s AI-driven support keeps you on track, predicting overdose risks, mapping lifesaving resources, logging meds, and curating uplifting content. A lifeline in recovery, always there.`,
    imgSrc: '/static/images/hygia.png',
    href: 'https://devpost.com/software/winter-arch',
  },
  {
    title: 'Osiris',
    description: `Orisis empowers farmers with AI-driven insights to boost productivity and sustainability. Its crop disease and pest detection features use machine learning to identify threats early, preventing losses. Integrated with sensors, it predicts soil quality and recommends optimal crops. It also tracks carbon emissions and curates vital farming news for informed decisions..`,
    imgSrc: '/static/images/osiris.png',
    href: 'https://devpost.com/software/osiris-cxf4b2',
  },
  {
    title: 'Aida',
    description: `Aida is an AI-powered assistant designed to support older adults facing memory decline, vision issues, social isolation, and language barriers. It functions as a personalized memory aid, allowing users to recall past conversations and retrieve important details through its Recall a Memory feature. The built-in OCR and search capabilities let users scan and query documents, whether they are bills, handwritten notes, or tax forms, making information retrieval effortless. Aida also assists with social interactions by transcribing and summarizing calls, enabling users to ask questions about past conversations, while emotion detection helps them engage more meaningfully.`,
    imgSrc: '/static/images/aida.png',
    href: 'https://devpost.com/software/aida-grbcfu',
  },
  {
    title: 'Proprium Times',
    description: `The Proprium Times reimagines the newspaper experience by blending classic print aesthetics with deeply personalized digital features
    It introduces predicted news to highlight how small actions today shape the future. Users can connect Spotify for artist trends and custom jokes, solve AI-generated crosswords and Sudoku, and read personalized short stories. The ShARe feature enables AR news visualization, while text-to-voice ensures accessibility, making the newspaper experience interactive, engaging, and uniquely personal.
    `,
    imgSrc: '/static/images/times.png',
    href: 'https://devpost.com/software/the-daily-prophet',
  },
]

export default projectsData
