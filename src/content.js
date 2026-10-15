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
      "I like building thoughtful things across code, design, and media. This space is still taking shape; soon it will hold the projects, experiments, photographs, and side quests that keep me curious about how ideas become things.",
    profileImage: "/images/profile.jpg",
    profileImageAlt:
      "Warm-toned desk setup with a Snoopy plush and computer screens",
    sections: [
      {
        heading: "about",
        items: [
          'currently exploring the space between <a href="/engineering">engineering</a>, <a href="/design">design</a>, and storytelling',
          "usually working on a side project, taking photos, or collecting ideas for the next one",
        ],
      },
      {
        heading: "what i've done",
        items: [
          "built small tools and experiments for the web",
          "designed interfaces, identities, and systems that make complicated things feel simpler",
          "worked across engineering and creative projects with people i like learning from",
          'made <a href="/multimedia">photos and videos</a> about places, people, and ordinary moments',
          "kept a growing archive of unfinished ideas, notes, and useful mistakes",
          "more details, links, and proper project write-ups are coming soon",
        ],
      },
      {
        heading: "what next",
        items: [
          "turn this temporary page into a real portfolio",
          "share more work instead of leaving it in folders",
          "keep making things and getting better at explaining why",
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
