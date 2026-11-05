---
title: 给 Agent 加上工具并处理出错
description: 定义工具、截断过长的返回、把错误也交给模型,让 Agent 能自己修正。
series: agent-intro
seriesTitle: Agent 入门
order: 3
date: 2026-11-05
tags: [Agent, Python]
---
> 这是示例教程,请替换成你自己的内容。

## 定义一个工具

```python
def read_file(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()[:4000]  # 截断,避免上下文膨胀

tools = {"read_file": read_file}
```

## 工具报错怎么办

不要让程序直接崩溃,把错误信息当作工具结果交给模型,它往往能自己改正:

```python
try:
    result = tools[call.name](**call.args)
except Exception as e:
    result = f"工具执行出错:{e}"
```

## 小结

到这里你已经有了一个能调用工具、能容错的 Agent。后续可以继续加上记忆和更多工具。
