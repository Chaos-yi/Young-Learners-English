/*
 * 小耳朵英语 · 内容数据
 * ------------------------------------------------------------
 * 不跟任何教材走，按 6–7 岁零基础孩子的生活场景编排：
 *   series   看动画：推荐的视频系列（家长在「家长中心 → 视频管理」里给每个系列添加 B 站链接）
 *   lessons  跟我说：16 课日常口语，每课 3–4 句；有 q 的是问答（先听问题再回答），只有 a 的是跟读
 *   themes   磨耳朵：听音选图的词库，每一关用一个主题
 *   actions  磨耳朵：动起来（听指令做动作）
 * 句子里的 {name} / {age} 会换成家长设置里的孩子英文名和年龄。
 */
window.LE = window.LE || {};

LE.DATA = {
  /* 看动画：stage 1 入门 → 2 进阶 → 3 提高。q 是在 B 站搜索用的关键词 */
  stages: {
    1: { title: '入门：儿歌和小对话', when: '第 1–2 个月' },
    2: { title: '进阶：生活动画和自然拼读', when: '第 2–4 个月' },
    3: { title: '提高：系统课程和更长的动画', when: '第 4 个月起' }
  },
  series: [
    { id: 'sss', stage: 1, title: 'Super Simple Songs', zh: '超级简单儿歌', pic: '🎵', tone: 'sun', accent: '美音', mins: '每首 2–3 分钟', why: '儿歌配动作，旋律简单、重复多，零基础从这里开始最轻松。', q: 'Super Simple Songs', note: 'Super Simple 官方说明国内可以在 UKids App 观看。' },
    { id: 'steve', stage: 1, title: 'Steve and Maggie', zh: '史蒂夫和麦琪', pic: '🐦', tone: 'sky', accent: '英音', mins: '每集 5–10 分钟', why: '英国老师 Steve 和喜鹊玩偶 Maggie，专门给非英语国家的小朋友做的，边玩边说，很多互动提问。', q: 'Steve and Maggie' },
    { id: 'singsing', stage: 1, title: 'English Singsing', zh: '英语小对话', pic: '💬', tone: 'leaf', accent: '美音', mins: '每集 1–3 分钟', why: '一集一个生活小对话，句子短、重复多，看完最适合到「跟我说」里练。', q: 'English Singsing' },
    { id: 'maisy', stage: 1, title: 'Maisy Mouse', zh: '小鼠波波', pic: '🐭', tone: 'berry', accent: '英音', mins: '每集 5 分钟', why: '画面简单、语速慢、句子极短，刚开始看动画时最容易听懂。', q: 'Maisy Mouse 英文' },
    { id: 'peppa', stage: 2, title: 'Peppa Pig', zh: '小猪佩奇（英文版）', pic: '🐷', tone: 'berry', accent: '英音', mins: '每集 5 分钟', why: '家里、幼儿园、公园的日常生活，句子都很常用，孩子也爱看。', q: 'Peppa Pig 英文版' },
    { id: 'alpha', stage: 2, title: 'Alphablocks', zh: '字母积木', pic: '🔤', tone: 'grape', accent: '英音', mins: '每集 3 分钟', why: 'BBC 出品，用动画学字母发音和拼读，正好配合学校学字母。', q: 'Alphablocks' },
    { id: 'number', stage: 2, title: 'Numberblocks', zh: '数字积木', pic: '🔢', tone: 'sky', accent: '英音', mins: '每集 5 分钟', why: 'BBC 出品，用英语数数、认数字，顺便学简单数学。', q: 'Numberblocks' },
    { id: 'sarah', stage: 2, title: 'Sarah & Duck', zh: '莎拉和乖乖鸭', pic: '🦆', tone: 'leaf', accent: '英音', mins: '每集 7 分钟', why: '节奏慢、对白少而清楚，画面很安静。', q: 'Sarah and Duck 英文' },
    { id: 'muzzy', stage: 3, title: 'Muzzy', zh: 'BBC 英语动画课', pic: '👾', tone: 'grape', accent: '英音', mins: '每集约 15 分钟', why: 'BBC 专门为外语学习者做的经典动画课程，故事里循序渐进地教常用句子，有 5–7 岁版本。', q: 'Muzzy BBC 英语动画' },
    { id: 'gogo', stage: 3, title: 'Gogo Loves English', zh: 'Gogo 学英语', pic: '📺', tone: 'sun', accent: '美音', mins: '每集约 10 分钟', why: '配套教材的系统动画课，每集一个主题（食物、学校、玩具……），句型由浅入深。', q: 'Gogo Loves English' },
    { id: 'duggee', stage: 3, title: 'Hey Duggee', zh: '嗨道奇', pic: '🐶', tone: 'sky', accent: '英音', mins: '每集 7 分钟', why: '大狗 Duggee 带小动物们做各种活动，剧情有趣，语速稍快。', q: 'Hey Duggee 英文' },
    { id: 'bluey', stage: 3, title: 'Bluey', zh: '布鲁伊', pic: '🐕', tone: 'leaf', accent: '澳式', mins: '每集 7 分钟', why: '一家人玩游戏的小故事，非常好看，语速较快，适合学了半年以后。', q: 'Bluey 英文版' }
  ],

  /* 跟我说：日常口语小课 */
  lessons: [
    { id: 'l01', en: 'Hello!', zh: '打招呼', pic: '👋', lines: [
      { pic: '👋', a: 'Hello!', zh: '你好！' },
      { pic: '🙋', q: "What's your name?", a: 'My name is {name}.', zh: '我叫 {name}。' },
      { pic: '🤝', a: 'Nice to meet you!', zh: '很高兴认识你！' },
      { pic: '🚌', a: 'Goodbye! See you!', zh: '再见！' }
    ] },
    { id: 'l02', en: 'How are you?', zh: '你好吗', pic: '😊', lines: [
      { pic: '😊', q: 'How are you?', a: "I'm fine, thank you.", zh: '我很好，谢谢。' },
      { pic: '😄', a: "I'm happy.", zh: '我很开心。' },
      { pic: '😴', a: "I'm tired.", zh: '我累了。' },
      { pic: '😋', a: "I'm hungry.", zh: '我饿了。' }
    ] },
    { id: 'l03', en: 'How old are you?', zh: '你几岁', pic: '🎂', lines: [
      { pic: '🎂', q: 'How old are you?', a: "I'm {age}.", zh: '我 {age} 岁。' },
      { pic: '🖐️', a: 'One, two, three, four, five!', zh: '一、二、三、四、五！' },
      { pic: '🐱', count: 3, q: 'How many cats?', a: 'Three cats.', zh: '三只猫。' }
    ] },
    { id: 'l04', en: 'What colour is it?', zh: '颜色', pic: '🎨', lines: [
      { pic: '🍎', q: 'What colour is it?', a: "It's red.", zh: '它是红色的。' },
      { pic: '🐸', q: 'What colour is it?', a: "It's green.", zh: '它是绿色的。' },
      { pic: '💙', a: 'My favourite colour is blue.', zh: '我最喜欢蓝色。' }
    ] },
    { id: 'l05', en: "What's this?", zh: '这是什么', pic: '🐶', lines: [
      { pic: '🐶', q: "What's this?", a: "It's a dog.", zh: '这是一只狗。' },
      { pic: '🐱', q: "What's this?", a: "It's a cat.", zh: '这是一只猫。' },
      { pic: '🐘', a: 'The elephant is big.', zh: '大象很大。' },
      { pic: '🐭', a: 'The mouse is small.', zh: '老鼠很小。' }
    ] },
    { id: 'l06', en: 'My family', zh: '我的家人', pic: '👨‍👩‍👧', lines: [
      { pic: '👩', a: 'This is my mum.', zh: '这是我妈妈。' },
      { pic: '👨', a: 'This is my dad.', zh: '这是我爸爸。' },
      { pic: '👵', q: "Who's she?", a: "She's my grandma.", zh: '她是我奶奶。' },
      { pic: '👨‍👩‍👧‍👦', a: 'I love my family.', zh: '我爱我的家人。' }
    ] },
    { id: 'l07', en: 'I like apples', zh: '喜欢吃什么', pic: '🍎', lines: [
      { pic: '🍎', q: 'Do you like apples?', a: 'Yes, I do.', zh: '是的，我喜欢。' },
      { pic: '🥕', q: 'Do you like carrots?', a: "No, I don't.", zh: '不，我不喜欢。' },
      { pic: '🍦', a: 'I like ice cream!', zh: '我喜欢冰淇淋！' },
      { pic: '🥛', a: 'Can I have some milk, please?', zh: '可以给我一些牛奶吗？' }
    ] },
    { id: 'l08', en: "I've got a ball", zh: '我的玩具', pic: '⚽', lines: [
      { pic: '⚽', a: "I've got a ball.", zh: '我有一个球。' },
      { pic: '🧸', q: 'Have you got a teddy bear?', a: 'Yes, I have.', zh: '是的，我有。' },
      { pic: '🪁', a: "Let's fly a kite!", zh: '我们去放风筝吧！' },
      { pic: '🤖', a: 'My favourite toy is my robot.', zh: '我最喜欢的玩具是机器人。' }
    ] },
    { id: 'l09', en: 'Touch your nose', zh: '身体', pic: '👃', lines: [
      { pic: '🙆', a: 'Touch your head.', zh: '摸摸你的头。' },
      { pic: '👃', a: 'Touch your nose.', zh: '摸摸你的鼻子。' },
      { pic: '👀', q: 'How many eyes have you got?', a: "I've got two eyes.", zh: '我有两只眼睛。' },
      { pic: '👏', a: 'Clap your hands!', zh: '拍拍手！' }
    ] },
    { id: 'l10', en: 'I can jump', zh: '我会做', pic: '🦘', lines: [
      { pic: '🦘', q: 'Can you jump?', a: 'Yes, I can.', zh: '是的，我会。' },
      { pic: '🏊', a: 'I can swim.', zh: '我会游泳。' },
      { pic: '🐦', q: 'Can a bird fly?', a: 'Yes, it can.', zh: '是的，它会。' },
      { pic: '🐟', q: 'Can a fish walk?', a: "No, it can't.", zh: '不，它不会。' }
    ] },
    { id: 'l11', en: 'Put on your shoes', zh: '穿衣服', pic: '👟', lines: [
      { pic: '👟', a: 'Put on your shoes.', zh: '穿上你的鞋子。' },
      { pic: '🧢', a: 'Put on your hat.', zh: '戴上你的帽子。' },
      { pic: '👕', q: 'What colour is your T-shirt?', a: 'My T-shirt is blue.', zh: '我的 T 恤是蓝色的。' }
    ] },
    { id: 'l12', en: "It's sunny", zh: '天气', pic: '☀️', lines: [
      { pic: '☀️', q: "What's the weather like?", a: "It's sunny.", zh: '今天是晴天。' },
      { pic: '🌧️', a: "It's rainy.", zh: '下雨了。' },
      { pic: '❄️', a: "It's cold.", zh: '天很冷。' },
      { pic: '☂️', a: 'Take your umbrella!', zh: '带上你的雨伞！' }
    ] },
    { id: 'l13', en: "Where's the cat?", zh: '在哪里', pic: '🐱', lines: [
      { pic: '🛏️🐱', q: "Where's the cat?", a: "It's on the bed.", zh: '它在床上。' },
      { pic: '📦🐶', q: "Where's the dog?", a: "It's in the box.", zh: '它在盒子里。' },
      { pic: '🪑⚽', q: "Where's the ball?", a: "It's under the chair.", zh: '它在椅子下面。' }
    ] },
    { id: 'l14', en: 'At school', zh: '在学校', pic: '🏫', lines: [
      { pic: '🙋', a: 'Good morning, teacher!', zh: '老师早上好！' },
      { pic: '📖', a: 'Open your book, please.', zh: '请打开你的书。' },
      { pic: '✏️', q: "What's this?", a: "It's a pencil.", zh: '这是一支铅笔。' },
      { pic: '🪑', a: 'Sit down, please.', zh: '请坐下。' }
    ] },
    { id: 'l15', en: 'Please and thank you', zh: '礼貌用语', pic: '🙏', lines: [
      { pic: '🙏', a: 'Thank you!', zh: '谢谢你！' },
      { pic: '😊', a: "You're welcome.", zh: '不客气。' },
      { pic: '😔', a: "I'm sorry.", zh: '对不起。' },
      { pic: '🙂', a: "That's OK.", zh: '没关系。' }
    ] },
    { id: 'l16', en: 'Good night', zh: '早晚问候', pic: '🌙', lines: [
      { pic: '🌞', a: 'Good morning, Mum!', zh: '妈妈早上好！' },
      { pic: '🪥', a: 'Brush your teeth.', zh: '刷牙啦。' },
      { pic: '🛏️', a: "It's time for bed.", zh: '该睡觉了。' },
      { pic: '🌙', a: 'Good night, Dad!', zh: '爸爸晚安！' }
    ] }
  ],

  /* 磨耳朵 · 听音选图：第 n 关用第 n 个主题（循环），color = 颜色色块，count = 图片重复几次 */
  themes: [
    {
      id: 'hello', en: 'Hello & Feelings', zh: '问候与心情', pic: '👋',
      words: [
        { en: 'hello', pic: '👋' },
        { en: 'goodbye', pic: '🙋' },
        { en: 'good morning', pic: '🌞' },
        { en: 'good night', pic: '🌙' },
        { en: 'thank you', pic: '🙏' },
        { en: 'happy', pic: '😄' },
        { en: 'sad', pic: '😢' },
        { en: 'hungry', pic: '😋' },
        { en: 'tired', pic: '😴' },
        { en: 'angry', pic: '😠' }
      ]
    },
    {
      id: 'colours', en: 'Colours', zh: '颜色', pic: '🎨',
      words: [
        { en: 'red', pic: '🍎', color: '#E53935' },
        { en: 'blue', pic: '🐳', color: '#1E73E8' },
        { en: 'yellow', pic: '🍌', color: '#FFCA28' },
        { en: 'green', pic: '🐸', color: '#2EAD4B' },
        { en: 'orange', pic: '🍊', color: '#FB8C00' },
        { en: 'pink', pic: '🐷', color: '#F06292' },
        { en: 'purple', pic: '🍇', color: '#8E44C9' },
        { en: 'brown', pic: '🐻', color: '#8D5A3B' },
        { en: 'black', pic: '🐈‍⬛', color: '#1C1C1C' },
        { en: 'white', pic: '⛄', color: '#FFFFFF' },
        { en: 'grey', pic: '🐘', color: '#8E9AA6' }
      ]
    },
    {
      id: 'numbers', en: 'Numbers', zh: '数字 1–10', pic: '🔢',
      words: [
        { en: 'one', pic: '☀️', count: 1 },
        { en: 'two', pic: '🐱', count: 2 },
        { en: 'three', pic: '🐦', count: 3 },
        { en: 'four', pic: '🐟', count: 4 },
        { en: 'five', pic: '🦆', count: 5 },
        { en: 'six', pic: '⚽', count: 6 },
        { en: 'seven', pic: '⭐', count: 7 },
        { en: 'eight', pic: '🚗', count: 8 },
        { en: 'nine', pic: '🥚', count: 9 },
        { en: 'ten', pic: '✏️', count: 10 }
      ]
    },
    {
      id: 'animals', en: 'Animals', zh: '动物', pic: '🐼',
      words: [
        { en: 'cat', pic: '🐱' },
        { en: 'dog', pic: '🐶' },
        { en: 'fish', pic: '🐟' },
        { en: 'bird', pic: '🐦' },
        { en: 'duck', pic: '🦆' },
        { en: 'cow', pic: '🐮' },
        { en: 'sheep', pic: '🐑' },
        { en: 'horse', pic: '🐴' },
        { en: 'frog', pic: '🐸' },
        { en: 'monkey', pic: '🐵' },
        { en: 'elephant', pic: '🐘' },
        { en: 'mouse', pic: '🐭' },
        { en: 'giraffe', pic: '🦒' },
        { en: 'tiger', pic: '🐯' },
        { en: 'zebra', pic: '🦓' },
        { en: 'snake', pic: '🐍' }
      ]
    },
    {
      id: 'family', en: 'Family', zh: '家人', pic: '👨‍👩‍👧',
      words: [
        { en: 'mum', pic: '👩' },
        { en: 'dad', pic: '👨' },
        { en: 'brother', pic: '👦' },
        { en: 'sister', pic: '👧' },
        { en: 'baby', pic: '👶' },
        { en: 'grandma', pic: '👵' },
        { en: 'grandpa', pic: '👴' },
        { en: 'friend', pic: '🧑‍🤝‍🧑' },
        { en: 'family', pic: '👨‍👩‍👧‍👦' }
      ]
    },
    {
      id: 'body', en: 'My Body', zh: '身体', pic: '🙆',
      words: [
        { en: 'head', pic: '🙆' },
        { en: 'face', pic: '😊' },
        { en: 'eyes', pic: '👀' },
        { en: 'ears', pic: '👂' },
        { en: 'nose', pic: '👃' },
        { en: 'mouth', pic: '👄' },
        { en: 'teeth', pic: '🦷' },
        { en: 'hair', pic: '💇' },
        { en: 'hand', pic: '✋' },
        { en: 'arm', pic: '💪' },
        { en: 'leg', pic: '🦵' },
        { en: 'foot', pic: '🦶' }
      ]
    },
    {
      id: 'school', en: 'School', zh: '学校', pic: '🏫',
      words: [
        { en: 'school', pic: '🏫' },
        { en: 'teacher', pic: '🧑‍🏫' },
        { en: 'book', pic: '📖' },
        { en: 'pen', pic: '🖊️' },
        { en: 'pencil', pic: '✏️' },
        { en: 'crayon', pic: '🖍️' },
        { en: 'ruler', pic: '📏' },
        { en: 'bag', pic: '🎒' },
        { en: 'chair', pic: '🪑' },
        { en: 'scissors', pic: '✂️' }
      ]
    },
    {
      id: 'toys', en: 'Toys', zh: '玩具', pic: '🧸',
      words: [
        { en: 'ball', pic: '⚽' },
        { en: 'teddy bear', pic: '🧸' },
        { en: 'doll', pic: '🪆' },
        { en: 'car', pic: '🚗' },
        { en: 'train', pic: '🚂' },
        { en: 'plane', pic: '✈️' },
        { en: 'boat', pic: '⛵' },
        { en: 'kite', pic: '🪁' },
        { en: 'robot', pic: '🤖' },
        { en: 'bike', pic: '🚲' },
        { en: 'balloon', pic: '🎈' }
      ]
    },
    {
      id: 'food', en: 'Food', zh: '食物', pic: '🍎',
      words: [
        { en: 'apple', pic: '🍎' },
        { en: 'banana', pic: '🍌' },
        { en: 'orange', pic: '🍊' },
        { en: 'grapes', pic: '🍇' },
        { en: 'carrot', pic: '🥕' },
        { en: 'bread', pic: '🍞' },
        { en: 'egg', pic: '🥚' },
        { en: 'rice', pic: '🍚' },
        { en: 'chicken', pic: '🍗' },
        { en: 'cake', pic: '🍰' },
        { en: 'ice cream', pic: '🍦' },
        { en: 'milk', pic: '🥛' },
        { en: 'water', pic: '💧' },
        { en: 'juice', pic: '🧃' }
      ]
    },
    {
      id: 'clothes', en: 'Clothes', zh: '衣服', pic: '👕',
      words: [
        { en: 'hat', pic: '👒' },
        { en: 'T-shirt', pic: '👕' },
        { en: 'dress', pic: '👗' },
        { en: 'trousers', pic: '👖' },
        { en: 'shorts', pic: '🩳' },
        { en: 'socks', pic: '🧦' },
        { en: 'shoes', pic: '👟' },
        { en: 'jacket', pic: '🧥' },
        { en: 'scarf', pic: '🧣' },
        { en: 'gloves', pic: '🧤' }
      ]
    },
    {
      id: 'home', en: 'My Home', zh: '家', pic: '🏠',
      words: [
        { en: 'house', pic: '🏠' },
        { en: 'door', pic: '🚪' },
        { en: 'window', pic: '🪟' },
        { en: 'bed', pic: '🛏️' },
        { en: 'sofa', pic: '🛋️' },
        { en: 'bath', pic: '🛁' },
        { en: 'TV', pic: '📺' },
        { en: 'clock', pic: '🕰️' },
        { en: 'box', pic: '📦' },
        { en: 'lamp', pic: '💡' }
      ]
    }
  ],

  /* 磨耳朵 · 动起来：听指令做动作 */
  actions: [
    { pic: '🙆', say: 'Touch your head.' },
    { pic: '👃', say: 'Touch your nose.' },
    { pic: '👂', say: 'Touch your ears.' },
    { pic: '👏', say: 'Clap your hands.' },
    { pic: '🦶', say: 'Stamp your feet.' },
    { pic: '🦘', say: 'Jump!' },
    { pic: '🔄', say: 'Turn around.' },
    { pic: '👋', say: 'Wave your hand.' },
    { pic: '🧍', say: 'Stand up.' },
    { pic: '🪑', say: 'Sit down.' },
    { pic: '🙌', say: 'Hands up!' },
    { pic: '🤫', say: 'Be quiet. Shh!' }
  ],

  /* 贴纸墙：每完成一天的路线解锁一张 */
  stickers: ['🦁', '🐼', '🦊', '🐨', '🐯', '🦄', '🐙', '🦋', '🐢', '🦉', '🐬', '🦒', '🐞', '🦜', '🐳', '🦩',
    '🐝', '🦔', '🐧', '🦓', '🐰', '🦕', '🐠', '🐿️', '🦦', '🐌', '🦚', '🐮', '🐲', '🦭'],

  /* 鼓励的话（不打分，说完就鼓励） */
  cheers: ['Good job!', 'Great!', 'Well done!', 'Super!', 'Nice!']
};
