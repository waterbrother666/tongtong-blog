---
title: 示例:用最少的代码写一个 Agent Loop
description: 一篇示例文章,演示代码高亮、目录与标签。Agent Loop 的核心就是"模型决定 → 调用工具 → 把结果喂回去"的循环。
date: 2026-11-03
tags: [Agent, Python]
category: 技术笔记
---
## 核心思路

Agent Loop 只有三步:让模型决定下一步,执行它选择的工具,把结果追加回对话,直到模型不再调用工具。

## 最小实现

```python
def run(messages, tools, llm, max_steps=8):
    for _ in range(max_steps):
        reply = llm(messages, tools=tools)
        messages.append(reply)
        if not reply.tool_calls:
            return reply.content
        for call in reply.tool_calls:
            result = tools[call.name](**call.args)
            messages.append({"role": "tool", "id": call.id, "content": str(result)})
    raise RuntimeError("超过最大步数")
```

## 要注意的几点

1. 必须设置最大步数,避免死循环
2. 工具返回要截断,避免上下文膨胀
3. 工具报错也要喂回模型,让它自己修正

> 这是示例文章,请替换成你自己的内容。
