// EDIT THIS FILE to change everything displayed on the site.
// Replace any `#` link when you are ready to add the real destination.
// Home introduction and list items can include simple HTML links.
export const siteContent = {
  siteName: "Johnny Ho",
  description:
    "Johnny Ho's portfolio for engineering, design, and multimedia work.",

  navigation: [
    { id: "home", label: "home", path: "/" },
    { id: "engineering", label: "engineering", path: "/engineering" },
    { id: "design", label: "design", path: "/design" },
    { id: "multimedia", label: "multimedia", path: "/multimedia" },
    { id: "life", label: "life.", path: "/life" },
  ],

  home: {
    title: "Johnny Ho",
    introduction:
      "Part-time engineering and design student, part-time creative, full-time napper. Born in Nanchang and based in Vancouver, I design, dream, and build things across engineering and art.",
    profileImage: "/images/profile.jpg",
    profileImageAlt:
      "Warm-toned desk setup with a Snoopy plush and computer screens",
    sections: [
      {
        heading: "about",
        items: [
          'studying <a href="https://www.sfu.ca/fas/schools/sustainable-energy-engineering.html">sustainable energy engineering</a> and <a href="https://www.sfu.ca/siat.html">interactive arts &amp; technology</a>, with <a href="https://www.sfu.ca/chang-institute/home.html">innovation + entrepreneurship</a> at sfu',
          "into f1, hockey, baseball, bouldering, badminton, esports, snoopy, cameras, music, and other retro things",
        ],
      },
      {
        heading: "what i've done",
        items: [
          'vp media + design at <a href="https://www.instagram.com/theforumsfu/">the forum sfu</a> — creative lead and graphic designer',
          'engineering design with <a href="https://www.enactussfu.ca/projects">nextspark at enactus sfu</a>',
          'mechanical + electrical team member at <a href="https://www.instagram.com/ewb.sfu/">engineers without borders sfu</a>',
          'multimedia work for <a href="https://www.youtube.com/@johostudio">@johostudio</a>, <a href="https://www.instagram.com/joho.studio/">@joho.studio</a>, and <a href="https://www.tiktok.com/@lifeofjoho?lang=en">@lifeofjoho</a>',
          'director of media at <a href="https://www.caseit.org/">caseit sfu</a>',
          'previous experience with <a href="https://subvision.ca/">subvision</a> and <a href="https://fbcyouthprogram.ca/ccsbc/">fraser basin council’s ccsbc</a>',
        ],
      },
      {
        heading: "what next",
        items: [
          "looking for spring 2027 engineering opportunities",
          "keep making things across engineering, design, and multimedia",
          "pass my classes and get a little more sleep",
        ],
      },
    ],
  },

  // Each secondary page can have its own temporary message.
  pageMessages: {
    engineering: "to be developed and designed soon :)",
    design: "to be developed and designed soon :)",
    multimedia: "to be developed and designed soon :)",
    life: "to be developed and designed soon :)",
  },

  footerLinks: [
    { label: "github", href: "https://github.com/johostudio" },
    { label: "linkedin", href: "https://www.linkedin.com/in/johnnyho06/" },
    { label: "email", href: "mailto:home@joho.studio" },
  ],
};
