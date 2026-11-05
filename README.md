# 通通的小站 · tongtong-blog

我的个人博客,基于 [Astro](https://astro.build) 搭建,记录技术笔记、教程和做过的项目。

## 特性

- **Astro + Tailwind CSS + MDX**,静态生成,速度快
- 深色 / 浅色模式,跟随系统并记住选择
- 玻璃拟态卡片、3D 倾斜与鼠标光晕、滚动渐显、页面转场
- **文章**:标签、归档、阅读时长、悬浮目录、代码高亮
- **教程**:按系列分组,章节有顺序,带上一章 / 下一章
- **项目展示**:卡片封面与详情页(私有项目只展示介绍和脱敏截图)
- [Giscus](https://giscus.app) 评论(基于 GitHub Discussions)
- RSS 与 sitemap

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev      # 开发服务器,http://localhost:4321
npm run build    # 构建到 dist/
npm run preview  # 预览构建结果
```

## 写内容

| 想做的事 | 怎么做 |
| --- | --- |
| 写文章 | 在 `src/content/posts/` 新建 `.md` 或 `.mdx` |
| 写教程 | 在 `src/content/tutorials/<系列>/` 下按章节新建文件,头部填 `series`、`seriesTitle`、`order` |
| 加项目 | 在 `src/content/projects/` 新建文件,可用 `cover` 指定封面图,公开项目填 `repo` |
| 换头像 | 把图片命名为 `avatar.png` / `avatar.jpg` / `avatar.webp` 放进 `public/` |
| 改站点名、导航、社交链接 | 编辑 `src/config.ts` |

文章、教程、项目的 frontmatter 字段定义见 `src/content.config.ts`。

## 配置评论(Giscus)

1. 准备一个公开仓库并开启 Discussions,安装 [giscus app](https://github.com/apps/giscus)。
2. 到 [giscus.app](https://giscus.app) 填写仓库,拿到 `repoId` 和 `categoryId`。
3. 填进 `src/config.ts` 的 `GISCUS`。留空则不显示评论区。

## 部署

构建产物是纯静态文件,可以部署到 Vercel、Netlify、GitHub Pages 等。部署前把 `astro.config.mjs` 里的 `site` 改成你的真实域名。

## 目录结构

```
src/
├── components/   导航、个人卡、卡片等组件
├── content/      文章、教程、项目的内容
├── layouts/      页面布局
├── lib/          小工具(封面渐变、阅读时长、教程分组)
├── pages/        路由页面
├── scripts/      前端交互(倾斜光晕、渐显、目录高亮)
└── styles/       全局样式
public/           头像、项目截图等静态资源
```

## 说明

- 代码以 [MIT 协议](LICENSE) 开源。
- `src/content/` 下的文章和教程是示例占位内容,请替换成你自己的。
- 头像、项目截图等个人素材版权归作者所有,使用本仓库作为模板时请替换成你自己的。

## 联系

- GitHub:[@waterbrother666](https://github.com/waterbrother666)
- X(推特):[@tongtongtmj](https://x.com/tongtongtmj)
