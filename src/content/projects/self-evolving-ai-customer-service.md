---
title: 健康商品咨询顾问
description: 自建 Agent Loop 的商品咨询系统。答案来自可核验的商品事实,分层管理长对话上下文,运营者可在教学工作台纠偏并把经验沉淀为可复用的教学总纲。全链路本地可跑。
tags: [FastAPI, Agent Loop, RAG, pgvector, React]
cover: /projects/self-evolving-ai-customer-service/buyer-consultation.png
order: 3
private: true
---
## 项目简介

买家用自然语言提问,Agent 自己决定调用哪些工具,返回带结构化商品卡片的回答;运营者在教学工作台里用真实对话纠偏,把经验沉淀成可复用的教学总纲。整条链路可以在本机完整跑通。

![买家咨询页:欢迎语、分类入口、示例问题与输入框](/projects/self-evolving-ai-customer-service/buyer-consultation.png)

## 想解决的四件事

1. **答案必须来自可核验的商品事实**,不让模型自由发挥库存、功效和适用人群。
2. **长对话不能越聊越贵、越聊越忘**,上下文要分层管理,归档后仍能检索回原文。
3. **运营者要能纠偏**,并且纠偏结果要沉淀下来影响后续回答,而不是改一次忘一次。
4. **能力边界要诚实**,答不了就请买家转人工,而不是编一个听起来像真的答案。

## 核心功能

- **买家咨询**:对话页用 SSE 流式返回正文增量、工具事件和上下文占用,正式结果以数据库提交后的终态为准。
- **商品检索**:先锁定有界候选,再对每个候选做关键词加向量的双路召回与 RRF 融合,最后统一重排。
- **结构化商品卡片**:卡片事实来自数据库快照。
- **分层上下文**:按有效输入上限的 50% / 70% / 90% 分别触发归档、会话摘要与完整档案,归档原文可按关键词或轮次读回。
- **用户画像**:增量提取,按账号身份各维护一份记忆,同身份跨会话共享,只使用用户本人的原话。
- **教学闭环**:教学工作台纠偏生成候选回复,确认后固化为教学样本。

## 系统架构

前端、API 层、Agent Loop、业务工具、上下文分层、外部模型服务与存储之间的关系:

![系统架构](/projects/self-evolving-ai-customer-service/architecture-overview.png)

一次提问的处理顺序:画像提取、组装输入、水位判断、模型推理与工具循环、最终回复、主事务提交,以及提交后发布画像文件并同步会话归档:

![一次提问的处理流程](/projects/self-evolving-ai-customer-service/turn-flow.png)

## 技术栈

FastAPI、自建 Agent Loop、PostgreSQL 17 加 pgvector、React 19,模型使用 DeepSeek。

## 说明

这是私有项目,这里只展示介绍,不提供源码。
