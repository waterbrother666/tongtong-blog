import fs from 'node:fs';
// 头像:把图片放到 public/avatar.png(或 .jpg/.jpeg/.webp)即可自动启用
export const avatar = ['avatar.png', 'avatar.jpg', 'avatar.jpeg', 'avatar.webp'].find((f) => fs.existsSync(`public/${f}`));
