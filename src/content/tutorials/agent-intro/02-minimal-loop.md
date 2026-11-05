---
title: 写一个最小的 Agent Loop
description: 用二十行代码实现"决定 → 调用工具 → 把结果喂回去"的循环。
series: agent-intro
seriesTitle: Agent 入门
order: 2
date: 2026-11-05
tags: [Agent, Python]
---
> 这是示例教程,请替换成你自己的内容。

## 核心循环

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

## 为什么要有最大步数

模型可能一直调用工具、永远不收尾。设置 `max_steps` 是最简单也最必要的保险。

## 小结

这就是 Agent 的骨架。下一章给它加上真正有用的工具,并处理出错的情况。
