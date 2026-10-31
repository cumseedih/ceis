<p align="center">
  <a href="../README.md">English</a> |
  <a href="./README_zh.md">简体中文</a> |
  <a href="./README_zh-TW.md">繁體中文</a> |
  <a href="./README_es.md">Español</a> |
  <a href="./README_fr.md">Français</a> |
  <a href="./README_id.md">Bahasa Indonesia</a> |
  <a href="./README_ja.md">日本語</a> |
  <a href="./README_ko.md">한국어</a> |
  <a href="./README_ru.md">Русский</a> |
  <a href="./README_vi.md">Tiếng Việt</a>
</p>
<p align="center">
  <a href="https://trendshift.io/repositories/286894?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-286894" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/286894/daily?language=Swift" alt="cumseedih%2Fceis | Trendshift" width="250" height="55"/></a>
</p>
<p align="center">
  <a href="https://github.com/cumseedih/ceis/stargazers"><img src="https://img.shields.io/github/stars/cumseedih/ceis?style=flat&label=stars" alt="GitHub stars"></a>
  <a href="https://github.com/cumseedih/ceis/releases"><img src="https://img.shields.io/github/downloads/cumseedih/ceis/total?label=downloads" alt="下载量"></a>
  <img src="https://hits.sh/github.com/cumseedih/ceis.svg?label=visitors&color=0a66e4&extraCount=16719" alt="Visitors">
  <a href="https://github.com/cumseedih/ceis/actions/workflows/ci.yml"><img src="https://github.com/cumseedih/ceis/actions/workflows/ci.yml/badge.svg?branch=main" alt="Test Suite"></a>
  <a href="https://github.com/cumseedih/ceis/blob/main/LICENSE"><img src="https://img.shields.io/github/license/cumseedih/ceis?label=license" alt="GPL-3.0-or-later"></a>
  <a href="https://arxiv.org/abs/2610.08699"><img src="https://img.shields.io/badge/arXiv-2610.08699-b31b1b" alt="arXiv 上的论文"></a>
  <br>
  <a href="https://wevvy.in/"><img src="https://img.shields.io/badge/%E5%AE%98%E7%BD%91-wevvy.in-0a66e4" alt="官网"></a>
  <a href="https://discord.gg/bkTySmm28X"><img src="https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
</p>

**ceis 是一个开源的个人智能体，面向你的每一台设备。** 一个有名字、有自己形象的智能体，和 Meta 的 [Muse](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/) 是同一类东西：不只回答问题，而是动手做事；App 关了也继续干；记得你；遇到无法撤销的操作会先停下来问你。


> [!NOTE]
> **ceis 在持续进化**
>
> 个人智能体不该只长在别人的云里，ceis 想做一个开源、低成本的平替：装在自己的设备上，模型自己选，中继也能自己架。我们希望和全球的开发者、使用者一起，让每个人真正拥有自己的个人智能体。提个 [issue](https://github.com/cumseedih/ceis/issues/new/choose) 或者发个 [PR](../../CONTRIBUTING.md) 都是在帮 ceis 变得更好。

https://github.com/user-attachments/assets/bf0ec2ae-59aa-4358-9dd0-c9d045ee7bee

<p align="center"><a href="https://wevvy.in/media/film/ceis-film-en-web.mp4">English</a> · <a href="https://wevvy.in/media/film/ceis-film-zh-web.mp4">中文</a> · <a href="https://wevvy.in/#film">wevvy.in</a></p>

## 🗞️ 动态

- `2026-10-13` ⭐ GitHub 上 1000 个 star，距首发十八天，期间连续四天进入 GitHub Trending 的 Swift 榜（[Trendshift](https://trendshift.io/repositories/286894) 的记录：10 月 7 日第七，10 月 10 日第四）。谢谢每一次试用、每一个问题报告和每一个 pull request。我们会继续做下去：每隔几天一个版本，下一步做什么写在[路线图](../roadmap.md)里。
- `2026-10-09` 🚀 版本 [1.0.0 Keel](https://github.com/cumseedih/ceis/releases/tag/v1.0.0) 发布，手机、电脑和浏览器都有；装在上一版之上，数据保留，每一处改动都写在发布说明里。
- `2026-10-08` 🤗 我们的论文登上 [Hugging Face Daily Papers](https://huggingface.co/papers/2610.08699)，在 10 月 8 日的榜单上排第三；欢迎到论文页提问和留言。
- `2026-10-07` 📄 我们的论文已发布在 [arXiv](https://arxiv.org/abs/2610.08699)：《ceis: An Open-Source Personal Agent for Every Device You Own》，作者 Guangyi Liu、Yong Liu、Jiangning Zhang（浙江大学）；引用格式见本页末尾。
- `2026-09-25` 🎉 ceis 以 GPL-3.0-or-later 发布在 GitHub：一个基于 OpenMinis 1.13 的 Android 应用；中继、电脑端和 iPhone 版在随后几天陆续到来。

全部版本：[releases](https://github.com/cumseedih/ceis/releases)。

## 安装

| | |
|---|---|
| **Android** 8.0 以上，arm64 | [ceis-1.0.5-arm64.apk](https://github.com/cumseedih/ceis/releases/download/v1.0.5/ceis-1.0.5-arm64.apk)：每个版本同一把签名，覆盖安装即可升级 |
| **iPhone / iPad** | [TestFlight](https://testflight.apple.com/join/ZHexbDqc)：测试版，已通过 Apple 的 beta 审核；从这个链接安装 · [iOS](../ios.md) |
| **macOS** 12 以上 | [Apple 芯片](https://github.com/cumseedih/ceis/releases/download/v1.0.5/ceis-Desktop-1.0.5-mac-arm64.dmg) · [Intel](https://github.com/cumseedih/ceis/releases/download/v1.0.5/ceis-Desktop-1.0.5-mac-x64.dmg)。没有公证：第一次右键 → 打开 |
| **Windows** 10 以上 | [ceis-Desktop-1.0.5-win-x64.exe](https://github.com/cumseedih/ceis/releases/download/v1.0.5/ceis-Desktop-1.0.5-win-x64.exe)：点一次「仍要运行」 |
| **Linux** x64 | [AppImage](https://github.com/cumseedih/ceis/releases/download/v1.0.5/ceis-Desktop-1.0.5-linux-x64.AppImage) · [.deb](https://github.com/cumseedih/ceis/releases/download/v1.0.5/ceis-Desktop-1.0.5-linux-x64.deb) · [tar.gz](https://github.com/cumseedih/ceis/releases/download/v1.0.5/ceis-Desktop-1.0.5-linux-x64.tar.gz) |
| **Docker** | `bash scripts/self-host.sh --local` 搭自己的中继；`docker compose up -d app` 在自己的服务器上跑网页版；见[自己部署](../self-hosting.md) |

下载都来自 [GitHub 最新版本](https://github.com/cumseedih/ceis/releases/latest)；GitHub 下不动时，同样的文件在 [wevvy.in/dl](https://wevvy.in/dl/)。打开 App，用邮箱或中国大陆手机号登录，它就有模型可用。手机、桌面和网页共用一个账号，看到的是同样的对话。

## 能做什么

<table>
  <tr>
    <td width="50%" valign="top"><b>动手做事。</b><br>Linux shell、浏览器、MCP 服务、技能；打开「手」之后，手机上的 App 和电脑上的窗口也能通过屏幕操作，给那些从来没有 API 的东西。</td>
    <td width="50%" valign="top"><b>关键处先问。</b><br>删除、发送、付款前先停下来问你，可以记住：只此一次、本次对话，或者一直允许；密码和验证码永远由你自己输。碰到登录或人机验证就交给你，点「完成」接着做。</td>
  </tr>
  <tr>
    <td width="50%" valign="top"><b>够得着别的设备。</b><br>手机上说一句，电脑上执行；消息以 <code>@Mac …</code> 开头，任务就去那台机器。审批回到你手里这台。</td>
    <td width="50%" valign="top"><b>一直在干。</b><br>目标按时检查，例程在 App 关着时照样跑，每天早上有写给你的动态。</td>
  </tr>
  <tr>
    <td width="50%" valign="top"><b>记得你。</b><br>它是谁、了解你什么、什么时候醒来，都是你能看、能改的 Markdown 文件。</td>
    <td width="50%" valign="top"><b>住在你的聊天软件里。</b><br>飞书、钉钉、企业微信、Telegram 里都能回复你。</td>
  </tr>
  <tr>
    <td width="50%" valign="top"><b>有自己的形象。</b><br>描述一句，你的图像模型来画，视频模型让它动起来。默认是一只小龙。</td>
    <td width="50%" valign="top"><b>任何模型。</b><br>中继的额度；自己在二十一家服务商（百炼、OpenRouter、OpenAI、Gemini、DeepSeek 等）任意一家的 key；或者你已经在付费的套餐：ChatGPT、Claude、Kimi。服务商没有图片或视频模型，这两项就不开，App 会直说。</td>
  </tr>
</table>

## 怎么工作

每台设备上都跑着自己的智能体：手机上在 APK 里（proot 下的 Alpine Linux、shell、浏览器、MCP），电脑上在 ceis Desktop 里（DeepSeek Harness 加上负责「手」的 Python 运行时）。登录后它们在中继上相遇，可以互相拜托；对话的文字经中继传递，文件和截图留在产生它们的设备上。

<p align="center">
  <img src="https://raw.githubusercontent.com/cumseedih/ceis/main/assets/brand/devices-loop.png" alt="Android、桌面端（Mac、Windows、Linux）、iPhone 和 iPad、网页版围绕同一个账号：中继负责登录，并在设备之间同步对话" width="92%">
</p>

[docs/every-device.md](../every-device.md) 讲设备之间怎么配合，[docs/hub.md](../hub.md) 讲帧格式，[docs/cloud.md](../cloud.md) 讲中继，[docs/privacy.md](../privacy.md) 讲它保存什么。

## 和 Muse、OpenMinis 的对比

| | Meta Muse | OpenMinis | ceis |
|---|---|---|---|
| 智能体跑在哪 | 每人一台云端 VM | 装了它的那台手机 | 你的手机、你的电脑，或者你自己的服务器，一个账号串起来 |
| 没有 API 的 App | 碰不到；VM 不碰你的设备 | Android 上的一个无障碍 CLI | 手机和电脑上都把屏幕当手：看截图，先试 API，登录由你接管。iOS 上没有，系统不允许 |
| 其他设备 | 同一台 VM 的多个客户端 | 只有装了它的那一台 | 设备之间通过 hub 互相拜托，审批在你手里的那台 |
| 模型 | Meta 的 | 自己带 | 中继的免费额度，或者自己的 |
| 许可 | 闭源 | GPL-3.0 | GPL-3.0-or-later，基于 OpenMinis |

## 文档

[wevvy.in/docs](https://wevvy.in/docs/)：各平台的安装、多端、「手」、连接器、记忆、自己部署、协议。源文件在 [docs/](../)；每个版本改了什么在 [CHANGELOG](../../CHANGELOG.md) 和 [docs/releases/](../releases/)。

## 自己部署

一台 VPS，一个小时：[docs/self-hosting.md](../self-hosting.md)。三条路：不要服务器、只用自己的 key；用 `scripts/self-host.sh` 搭自己的中继；在自己的机器上跑网页版的运行时。

## 参与

拿它做一件真事，报告哪里坏了，然后挑一件小而具体的事做：[CONTRIBUTING.md](../../CONTRIBUTING.md) 有环境和约定，[AGENTS.md](../../AGENTS.md) 是编程智能体在这棵树里要守的规矩，[路线图](../roadmap.md)说从哪儿入手。[Issues](https://github.com/cumseedih/ceis/issues) · [Discussions](https://github.com/cumseedih/ceis/discussions) · [Discord](https://discord.gg/bkTySmm28X)。

## 维护者

<table>
  <tr>
    <td align="center"><a href="https://github.com/lgy0404"><img src="https://avatars.githubusercontent.com/u/63797388?v=4&s=80" width="80" height="80" alt="Guangyi Liu"><br><strong>Guangyi Liu</strong></a><br><a href="mailto:guangyiliu@zju.edu.cn"><img src="https://img.shields.io/badge/e--mail-guangyiliu%40zju.edu.cn-0a66e4" alt="guangyiliu@zju.edu.cn"></a></td>
  </tr>
</table>

## 社区贡献者

每一位有改动合并进 `main` 的人，取自 GitHub 的贡献者列表。

<!-- contributors:start -->
<p>
<a href="https://github.com/wsvn53"><img src="https://avatars.githubusercontent.com/u/912204?v=4&s=48" width="48" height="48" alt="wsvn53"></a>
<a href="https://github.com/cutey-none"><img src="https://avatars.githubusercontent.com/u/47075002?v=4&s=48" width="48" height="48" alt="cutey-none"></a>
<a href="https://github.com/Mola-maker"><img src="https://avatars.githubusercontent.com/u/229602071?v=4&s=48" width="48" height="48" alt="Mola-maker"></a>
<a href="https://github.com/PovedaAqui"><img src="https://avatars.githubusercontent.com/u/9494679?v=4&s=48" width="48" height="48" alt="PovedaAqui"></a>
<a href="https://github.com/jiangkaiqi2005"><img src="https://avatars.githubusercontent.com/u/184961141?v=4&s=48" width="48" height="48" alt="jiangkaiqi2005"></a>
<a href="https://github.com/Ichiro786"><img src="https://avatars.githubusercontent.com/u/158778170?v=4&s=48" width="48" height="48" alt="Ichiro786"></a>
<a href="https://github.com/hobostay"><img src="https://avatars.githubusercontent.com/u/110803307?v=4&s=48" width="48" height="48" alt="hobostay"></a>
<a href="https://github.com/aliabbas6622"><img src="https://avatars.githubusercontent.com/u/193962983?v=4&s=48" width="48" height="48" alt="aliabbas6622"></a>
<a href="https://github.com/cypggs"><img src="https://avatars.githubusercontent.com/u/3694954?v=4&s=48" width="48" height="48" alt="cypggs"></a>
</p>
<!-- contributors:end -->

## ⭐️ 引用

如果 ceis 对你有帮助，欢迎引用我们的论文。

```bibtex
@misc{liu2026ceisopensourcepersonalagent,
      title={ceis: An Open-Source Personal Agent for Every Device You Own}, 
      author={Guangyi Liu and Yong Liu and Jiangning Zhang},
      year={2026},
      eprint={2610.08699},
      archivePrefix={arXiv},
      primaryClass={cs.AI},
      url={https://arxiv.org/abs/2610.08699}, 
}
```

## 致谢

ceis 站在别人的工作之上；条款见 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。

- [OpenMinis](https://github.com/OpenMinis/OpenMinis)：手机 App 所基于的端侧智能体，沙箱来自 proot 和 [Alpine Linux](https://alpinelinux.org/)。
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)：桌面 App 作为插件运行在它上面。
- [UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop)（字节跳动）：桌面端「手」的操作器移植自它，舞台上的标记参考它的 ScreenMarker。
- [MobileGym](https://github.com/Purewhiter/mobilegym)、[MemGUI-Bench](https://github.com/lgy0404/MemGUI-Bench)、[PhoneHarness](https://github.com/PhoneHarness/PhoneHarness)、[CopilotKit/OpenMuse](https://github.com/CopilotKit/OpenMuse)、[Open-AutoGLM](https://github.com/zai-org/Open-AutoGLM)、[ClawGUI](https://github.com/ZJU-REAL/ClawGUI)：手机操作器、轨迹和产品思路。

## 声明

ceis 是独立的社区项目，与 Meta Platforms, Inc. 无关，也未获其背书；Muse 是他们的商标。小龙是本项目自己的。

## 许可

[GPL-3.0-or-later](../../LICENSE)。手机 App 基于 OpenMinis 1.13（GPL-3.0），自 2026-09-24 起修改，见 [NOTICE](../../NOTICE)。Python 线更早的版本是 MIT（tag `pre-openminis`）。

<p align="center">
  <em>感谢来访 ✨ ceis。</em><br><br>
  <img src="https://hits.sh/github.com/cumseedih/ceis.svg?label=visitors&color=0a66e4&extraCount=16719" alt="Visitors">
</p>
