export const SITE = {
  title: 'tongtong',
  description: 'tongtong 的个人博客:技术笔记、教程与项目作品。',
  author: 'tongtong',
  github: 'https://github.com/waterbrother666',
  twitter: 'https://x.com/tongtongtmj', // 推特(X):@tongtongtmj
  email: '', // 想公开联系方式就填在这里
};

export const NAV = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '文章' },
  { href: '/tutorials', label: '教程' },
  { href: '/projects', label: '项目' },
  { href: '/archive', label: '归档' },
  { href: '/about', label: '关于' },
];

// Giscus 评论:到 https://giscus.app 填写你的公开仓库,把生成的值填到这里。留空则不显示评论区。
export const GISCUS = {
  repo: '', // 例如 'waterbrother666/self-blog'
  repoId: '',
  category: 'Announcements',
  categoryId: '',
};
