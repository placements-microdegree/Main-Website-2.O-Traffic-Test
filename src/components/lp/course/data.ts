// Content shared by the live-recorded course pages (/PowerBi, /dockerandkubernetes, /java-at). Moved verbatim from those pages.
export const reviews = [
 {
  "avatar": "https://ik.imagekit.io/microdegree/Naveen-kumar_tIH5Opg8FL.png?updatedAt=1729674369138",
  "name": "Naveen Kumar",
  "text": "I am really happy that I have take DevOps course in MicroDegree & successfully I have got job as a DevOps engineer. My all credit goes to Sumeet Kulkarni sir Bez the way he explained all topics in my native language and even small doubts he cleared in each and every day class. I feel I am very lucky to have sir like Sumeet Kulkarni sir batch. I highly recommend Sumeet Kulkarni sir batch"
 },
 {
  "avatar": "https://ik.imagekit.io/microdegree/Nagraj_zsKNWZgp_.png?updatedAt=1729668471253",
  "name": "Nagraj",
  "text": "I recently completed my training in DevOps class taught by Sumeet Kulkarni sir, the training was excellent with good interaction, knowledge sharing is good and recording facility is excellent for revising. Course was practically and informative. Sumeet Sir was enthusiastic and really aware of what he is explaining and most supportive at all the time and making complex concepts much easier for students to understand and apply them in real-world scenarios. Overall, I would highly recommend Sumeet Kulkarni sir as a DevOps teacher to anyone looking to deepen their understanding of DevOps practices and principles."
 },
 {
  "avatar": "https://ik.imagekit.io/microdegree/pavan-Kumar_ge5M_RrSe.png?updatedAt=1729674369196",
  "name": "Pavan Kumar",
  "text": "Sumeet sir you beauty the way of teaching style is superb 👌.We feeling like easy on Devops after listening your classes. Nivu course start madbek adre helidri na Devops na ninge easy madikodtini antha,helidhage madidhira"
 },
 {
  "avatar": "https://ik.imagekit.io/microdegree/Deepashree-Ashok_oShSevBQUv.png?updatedAt=1729674369193",
  "name": "Deepashree Ashok",
  "text": "I am pursuing AWS and Devops class in microdegree. I am very happy with the teaching here. Complicated topics are made easy with simple examples and learning in mother tongue is the best part. Devops trainer Sumeet Kulkarni is the best. He has great knowledge on topics and he is very approachable. If anyone is planning to join the course here, go for it."
 }
];

export const awards = [
	{ imageUrl: 'https://ik.imagekit.io/microdegree/A&R1_QSAC88mF6.webp?updatedAt=1730109080391', title1: 'Best Skilling Platform Award', title2: 'MicroDegree honored with prestigious award for its transformative impact at grassroots.' },
	{ imageUrl: 'https://ik.imagekit.io/microdegree/a2_S-tBT-aVq.webp?updatedAt=1730469249489', title1: 'Winning Elevate 2020', title2: 'MicroDegree chosen as one of the top 100 startups by Govt. of Karnataka.' },
	{ imageUrl: 'https://ik.imagekit.io/microdegree/a3_sbZtp7nLR.webp?updatedAt=1730469249363', title1: 'Awarded by IEEE', title2: 'MicroDegree impacted 3000+ rural talent imparting tech sessions in Kannada.' },
];

export const testimonials = [
	{ title1: 'Kruthika', title2: 'ECE to IT', videoId: 'zjKL3vpQ6jA' },
	{ title1: 'Noothan S', title2: 'Civil to IT', videoId: 'xxhSK8XjglA' },
	{ title1: 'Yashas', title2: 'Mechanical to IT', videoId: 'nB8sXL_GOJA' },
];

export const successStories = [
	'https://ik.imagekit.io/microdegree/WhatsApp%20Image%202024-10-23%20at%202.13.20%20PM%20(1)_tm_9yQijC.jpeg?updatedAt=1729674369213',
	'https://ik.imagekit.io/microdegree/WhatsApp%20Image%202024-10-23%20at%202.13.21%20PM_ca6QSjbbI6.jpeg?updatedAt=1729674369181',
	'https://ik.imagekit.io/microdegree/WhatsApp%20Image%202024-10-23%20at%202.13.40%20PM_q0uz0yCtOH.jpeg?updatedAt=1729674369176',
	'https://ik.imagekit.io/microdegree/WhatsApp%20Image%202024-10-23%20at%202.13.21%20PM%20(1)_hHY5qKHzc.jpeg?updatedAt=1729674369141',
	'https://ik.imagekit.io/microdegree/WhatsApp%20Image%202024-10-23%20at%202.13.15%20PM_BfiMJKPz9e.jpeg?updatedAt=1729674369200',
	'https://ik.imagekit.io/microdegree/WhatsApp%20Image%202024-10-23%20at%202.13.20%20PM_TyCfI8zu7m.jpeg?updatedAt=1729674369134',
];

export const trainerFeedback = [1, 2, 3, 4].map((n) => `/img/courses/trainers-feedback/pbi${n}.webp`);

export const companyLogos = ['flipcart', 'accenture', 'adobe', 'airbus', 'ey', 'harman', 'walmart', 'matchmove', 'tcs'].map((n) => `/img/courses/company-logos/${n}.png`);

export const newsImage = 'https://ik.imagekit.io/MicroDegree/Website/homeWebp/section9/news1.webp?updatedAt=1681880939851';
export const newsVideos = ['https://www.youtube.com/embed/bzl_X7dRo8k?si=0hDgJQCBqNaDRNEK', 'https://www.youtube.com/embed/y9yhmSQ6qlw?si=oMU91Yl7mTeNyyPp'];

export const team = ['teamimg1.jpeg', 'teamimg2.jpeg', 'teamimg3.webp', 'teamimg4.webp'].map((n) => `/img/courses/team/${n}`);

export const supportedBy = [1, 2, 3, 5].map((n) => `https://ik.imagekit.io/MicroDegree/Website/homeWebp/Section3/brandLogo${n}.png?updatedAt=${({1:'1681880924879',2:'1681880925403',3:'1681880926709',5:'1681880927885'} as Record<number,string>)[n]}`);

export const pricing = {
	price: '₹7,500',
	gst: '+GST',
	strike: '₹20,000',
	points: ['Learn by Building Interactive Projects', 'Learn in Kannada', 'Get Skilled in Coolest Tech', 'Learn from Top Tech Professionals'],
};

export const stats = [
	{ icon: 'fa-solid fa-users text-purple-500', value: 100000, label: 'Active Students' },
	{ icon: 'fa-brands fa-youtube text-red-600', value: 87000, label: 'YouTube Subscribers' },
	{ icon: 'fa-brands fa-instagram text-pink-600', value: 52000, label: 'Instagram Followers' },
	{ icon: 'fa-brands fa-telegram text-blue-400', value: 25000, label: 'Telegram Followers' },
];
