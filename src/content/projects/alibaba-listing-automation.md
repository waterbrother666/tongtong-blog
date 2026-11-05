---
title: 国际站发品助手
description: 在 Excel 里填好商品资料,在客户端选表确认,助手自动在国际站后台复制参考商品、替换标题卖点和图片并提交,再把新商品 ID 写回表格。提供 Mac 与 Windows 客户端。
tags: [Python, 桌面客户端, Chrome 扩展, 网页自动化]
cover: /projects/alibaba-listing-automation/client-publish.png
order: 2
private: true
---
## 项目简介

把商品资料填进 Excel 发品表,在客户端里选表、确认,助手就会在国际站后台复制参考商品,换上新标题、卖点和图片后提交,并把新商品 ID 写回表格。面向已经有可复制商品、想减少重复上架操作的运营人员。

![发品助手主界面:选表后自动检查,每行显示能不能发、为什么](/projects/alibaba-listing-automation/client-publish.png)

*界面截图使用的是演示数据。*

## 核心功能

- **批量发品**:一张表一次发多条商品,一行一条;一条发完并确认结果后再发下一条。
- **按行指定参考商品**:每行可以使用不同的参考商品。参考商品本身不会被修改。
- **图片按需替换**:主图每条 1–6 张;尺码图、场景图、模特图、细节图按需替换,没填的分类保留原图。
- **防重复与失败处理**:已发布的行自动跳过,不会重复发布;没发成功的会集中到「待处理」,并提示下一步怎么做。
- **发布前检查**:选表后自动检查,每一行都会显示能不能发、为什么。

## 界面

发布中,每一行实时显示进度,发完的会显示新商品 ID:

![发布中的主窗口](/projects/alibaba-listing-automation/client-progress.png)

发布前会弹出确认框,列出这一次要真实发布的商品:

![确认框](/projects/alibaba-listing-automation/client-confirm.png)

没发成功或需要确认的商品会集中到「待处理」:

![待处理](/projects/alibaba-listing-automation/client-pending.png)

设置页可以做发布前检查、Chrome 扩展连接和修复:

![设置页](/projects/alibaba-listing-automation/client-settings.png)

## 工作原理

发品表、助手 app、本机连接组件、Chrome 扩展和国际站后台之间的关系,以及每条商品的处理顺序:

![工作原理](/projects/alibaba-listing-automation/architecture.png)

## 形态

做成了桌面客户端,同时提供 Mac 与 Windows 版本,配合一个 Chrome 扩展连接国际站商家后台。

## 技术栈

Python、桌面客户端、Chrome 扩展、网页自动化,以 Excel 作为数据入口和结果回写。

## 说明

这是私有项目,这里只展示介绍,不提供源码和下载。
