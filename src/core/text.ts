// 全部文案与出处。页面上的每一句带引号的话都必须能在这里找到，并由 verify 反查。

export interface Source {
  key: string;
  title: string;
  detail: string;
  url: string;
}

export const SOURCES: Source[] = [
  {
    key: "dangan",
    title: "无锡市档案史志馆《寄畅园》",
    detail: "建园、改名、张涟叠山、八音涧、康熙乾隆临幸、兵火、1952 献园、面积十五亩",
    url: "https://daj.wuxi.gov.cn/doc/2013/02/28/2426783.shtml",
  },
  {
    key: "taihu",
    title: "太湖风景名胜区《【老金说惠山】寄畅园》",
    detail: "正德嘉靖间秦金建园、1560 秦梁理荒改名凤谷山庄、1599 秦耀改名寄畅园、二十景、1860—1863 兵火、1883 重修知鱼槛",
    url: "https://zyb.taihufengjing.com/Article?Id=975832a0-18e2-472c-9d6a-93522c4c6dea",
  },
  {
    key: "chla",
    title: "风景园林网《无锡私家园林之寄畅园》",
    detail: "借景惠山与锡山龙光塔、锦汇漪、知鱼槛、七星桥、八音涧「声若风雨」",
    url: "https://chla.com.cn/html/c186/2008-06/10752.html",
  },
  {
    key: "toutiao",
    title: "《筑山理水，寄畅山林》",
    detail: "嘉树堂向东南望锡山与龙光塔、八音涧总长 36 米、鹤步滩与知鱼槛收束水面",
    url: "https://www.toutiao.com/article/7390152457143337526",
  },
  {
    key: "wiki",
    title: "维基百科《寄畅园》",
    detail: "王羲之「寄畅山水阴」句、乾隆携图归京仿建惠山园（今谐趣园）",
    url: "https://zh.wikipedia.org/wiki/%E5%AF%84%E6%9A%A2%E5%9C%92",
  },
];

/** 带引号的原文，逐条注出处。verify 会核对它们真的出现在页面上、且都有 cite。 */
export const QUOTES = [
  {
    key: "q-qinjin",
    text: "名山投老住，卜筑有行窝。曲涧盘幽石，长松育碧萝。",
    who: "秦金《凤谷行窝》",
    source: "wiki",
    era: "约 1527",
  },
  {
    key: "q-yizhi",
    text: "取欢仁智乐，寄畅山水阴。",
    who: "王羲之《答许询》",
    source: "wiki",
    era: "1599",
  },
  {
    key: "q-qianlong",
    text: "江南诸名胜，唯惠山秦园最古。",
    who: "乾隆",
    source: "taihu",
    era: "1751",
  },
  {
    key: "q-qianlong2",
    text: "一沼一亭皆曲肖，古柯终觉胜其间。",
    who: "乾隆《再题寄畅园》",
    source: "taihu",
    era: "1762",
  },
  {
    key: "q-binghuo",
    text: "台榭之胜，一变而为蔓草荒烟。",
    who: "《寄畅园旧事》述庚申之变后园况",
    source: "taihu",
    era: "1860",
  },
  {
    key: "q-zhuyu",
    text: "子非鱼，安知鱼之乐？",
    who: "《庄子·秋水》（知鱼槛得名）",
    source: "toutiao",
    era: "1599",
  },
] as const;

export interface LevelCopy {
  id: number;
  era: string;
  year: string;
  name: string;
  task: string;
  note: string;
  /** 完成时淡入的那句话 */
  closingKey: string;
  /** 手柄上的两个词，告诉玩家能挪什么 */
  handles: string[];
}

export const LEVELS: LevelCopy[] = [
  {
    id: 1,
    era: "明·正德年间",
    year: "约 1527",
    name: "凤谷行窝",
    task: "把惠山借进墙头。山要整条露出来，树要挡在山最矮的那一段。",
    note: "秦金买下惠山寺的两间僧舍，取名凤谷行窝。园里只有一道粉墙、一株老树。山是别人的。",
    closingKey: "q-qinjin",
    handles: ["墙", "树"],
  },
  {
    id: 2,
    era: "明·万历二十七年",
    year: "1599",
    name: "寄畅园",
    task: "让龙光塔落在两根廊柱之间。塔尖不触檐，塔脚不入园——用雾埋住它。",
    note: "秦耀罢官归乡，把园子改成二十景，一景一诗。塔在墙外的锡山上，他要它看起来像园里的。",
    closingKey: "q-yizhi",
    handles: ["左柱", "右柱", "檐口", "雾"],
  },
  {
    id: 3,
    era: "清·乾隆十六年",
    year: "1751",
    name: "南巡",
    task: "把这座园子，借进一张画里。",
    note: "皇帝来了，说「爱其幽致」，命画工绘图，携图以归。四年后，北京万寿山下多了一座惠山园。",
    closingKey: "q-qianlong",
    handles: ["画框", "右下角"],
  },
  {
    id: 4,
    era: "清·咸丰十年",
    year: "1860",
    name: "庚申",
    task: "园子没了。只剩一段断墙。让开塔，给水留一条。",
    note: "兵火过后，东南部尽毁，台榭之胜一变而为蔓草荒烟。塔还在山上。园子不在了。",
    closingKey: "q-binghuo",
    handles: ["断墙"],
  },
  {
    id: 5,
    era: "二〇二六",
    year: "今天",
    name: "回借",
    task: "墙外起了高楼，塔看不见了。把你记得的那次取景，放回去。",
    note: "1952 年，秦氏后人把园子献给了国家。园子只有十五亩。山，是整个江南的。",
    closingKey: "q-qianlong2",
    handles: ["记忆里的塔", "楼"],
  },
];

export const COVER = {
  title: "借山",
  latin: "Borrowed Mountain",
  sub: "无锡寄畅园 · 五个年代 · 一种手法",
  lead: "园子只有十五亩。山，是整个江南的。",
  start: "入园",
  howto: "拖动画面里的东西。每一关只有一个动作：借。",
};

export const END = {
  title: "卷末",
  line: "五百年里，园子被毁过三次，修过三次。山一直在墙外。",
  again: "再借一次",
  save: "存下这张图",
  sources: "出处",
  ai: "AI 说明",
};

export const AI_NOTE = {
  title: "AI 使用说明",
  body: [
    "画面：程序化绘制（山脊、塔、墙、树、水），不使用任何实景照片。宣纸与墨晕底纹由生成式模型产出，只作纹理使用，不含具体景物。",
    "文字：全部由人工撰写并逐条核对出处；引用原文见「出处」。",
    "代码：由 AI 编程助手编写，可复现构建与验证（见仓库 README 与 scripts/）。",
    "本作不含任何第三方素材、字体以外的外部资源；字体为 Noto Serif SC（SIL OFL 1.1），随包提供子集。",
  ],
};
