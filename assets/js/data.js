/*
 * 小耳朵英语 · 内容数据
 * ------------------------------------------------------------
 * 词表和句型以剑桥 Pre A1 Starters 范围为骨架（Power Up 1–2 级大致对应这个难度），
 * 用词按英式英语（grey / favourite / trousers / mum）。
 * 按机构 Power Up 当前单元扩充时，直接在对应主题的 words 里加条目即可：
 *   { en: '单词', zh: '中文提示', pic: '图片(emoji)', say: '例句' }
 * 可选字段：color（颜色主题的色块）、count（数字主题，pic 会重复 count 次）、
 *          ask（复习时看图提的问题，默认用主题的 ask 或 "What's this?"）
 */
window.LE = window.LE || {};

LE.DATA = {
  themes: [
    {
      id: 'hello', en: 'Hello & Feelings', zh: '问候与心情', pic: '👋', ask: 'What do you say?',
      words: [
        { en: 'hello', zh: '你好', pic: '👋', say: "Hello! I'm Mia." },
        { en: 'goodbye', zh: '再见', pic: '🙋', say: 'Goodbye! See you tomorrow.' },
        { en: 'good morning', zh: '早上好', pic: '🌞', say: 'Good morning, Mum!' },
        { en: 'good night', zh: '晚安', pic: '🌙', say: 'Good night, Dad!' },
        { en: 'thank you', zh: '谢谢', pic: '🙏', say: 'Thank you!' },
        { en: 'happy', ask: 'How do you feel?', zh: '开心', pic: '😄', say: "I'm happy." },
        { en: 'sad', ask: 'How do you feel?', zh: '难过', pic: '😢', say: "I'm sad." },
        { en: 'hungry', ask: 'How do you feel?', zh: '饿', pic: '😋', say: "I'm hungry." },
        { en: 'tired', ask: 'How do you feel?', zh: '累/困', pic: '😴', say: "I'm tired." },
        { en: 'angry', ask: 'How do you feel?', zh: '生气', pic: '😠', say: "I'm angry." }
      ]
    },
    {
      id: 'colours', en: 'Colours', zh: '颜色', pic: '🎨', ask: 'What colour is it?',
      words: [
        { en: 'red', zh: '红色', pic: '🍎', color: '#E53935', say: 'The apple is red.' },
        { en: 'blue', zh: '蓝色', pic: '🐳', color: '#1E73E8', say: 'The whale is blue.' },
        { en: 'yellow', zh: '黄色', pic: '🍌', color: '#FFCA28', say: 'The banana is yellow.' },
        { en: 'green', zh: '绿色', pic: '🐸', color: '#2EAD4B', say: 'The frog is green.' },
        { en: 'orange', zh: '橙色', pic: '🍊', color: '#FB8C00', say: 'The orange is orange.' },
        { en: 'pink', zh: '粉色', pic: '🐷', color: '#F06292', say: 'The pig is pink.' },
        { en: 'purple', zh: '紫色', pic: '🍇', color: '#8E44C9', say: 'The grapes are purple.' },
        { en: 'brown', zh: '棕色', pic: '🐻', color: '#8D5A3B', say: 'The bear is brown.' },
        { en: 'black', zh: '黑色', pic: '🐈‍⬛', color: '#1C1C1C', say: 'The cat is black.' },
        { en: 'white', zh: '白色', pic: '⛄', color: '#FFFFFF', say: 'The snowman is white.' },
        { en: 'grey', zh: '灰色', pic: '🐘', color: '#8E9AA6', say: 'The elephant is grey.' }
      ]
    },
    {
      id: 'numbers', en: 'Numbers', zh: '数字 1–10', pic: '🔢', ask: 'How many?',
      words: [
        { en: 'one', zh: '一', pic: '☀️', count: 1, say: 'I can see one sun.' },
        { en: 'two', zh: '二', pic: '🐱', count: 2, say: 'I can see two cats.' },
        { en: 'three', zh: '三', pic: '🐦', count: 3, say: 'I can see three birds.' },
        { en: 'four', zh: '四', pic: '🐟', count: 4, say: 'I can see four fish.' },
        { en: 'five', zh: '五', pic: '🦆', count: 5, say: 'I can see five ducks.' },
        { en: 'six', zh: '六', pic: '⚽', count: 6, say: 'I can see six balls.' },
        { en: 'seven', zh: '七', pic: '⭐', count: 7, say: 'I can see seven stars.' },
        { en: 'eight', zh: '八', pic: '🚗', count: 8, say: 'I can see eight cars.' },
        { en: 'nine', zh: '九', pic: '🥚', count: 9, say: 'I can see nine eggs.' },
        { en: 'ten', zh: '十', pic: '✏️', count: 10, say: 'I can see ten pencils.' }
      ]
    },
    {
      id: 'animals', en: 'Animals', zh: '动物', pic: '🐼',
      words: [
        { en: 'cat', zh: '猫', pic: '🐱', say: 'The cat says meow.' },
        { en: 'dog', zh: '狗', pic: '🐶', say: 'The dog says woof.' },
        { en: 'fish', zh: '鱼', pic: '🐟', say: 'The fish can swim.' },
        { en: 'bird', zh: '鸟', pic: '🐦', say: 'The bird can fly.' },
        { en: 'duck', zh: '鸭子', pic: '🦆', say: 'The duck says quack.' },
        { en: 'cow', zh: '奶牛', pic: '🐮', say: 'The cow says moo.' },
        { en: 'sheep', zh: '绵羊', pic: '🐑', say: 'The sheep says baa.' },
        { en: 'horse', zh: '马', pic: '🐴', say: 'The horse can run.' },
        { en: 'frog', zh: '青蛙', pic: '🐸', say: 'The frog can jump.' },
        { en: 'monkey', zh: '猴子', pic: '🐵', say: 'The monkey can climb.' },
        { en: 'elephant', zh: '大象', pic: '🐘', say: 'The elephant is big.' },
        { en: 'mouse', zh: '老鼠', pic: '🐭', say: 'The mouse is small.' },
        { en: 'giraffe', zh: '长颈鹿', pic: '🦒', say: 'The giraffe is tall.' },
        { en: 'tiger', zh: '老虎', pic: '🐯', say: 'The tiger is orange and black.' },
        { en: 'zebra', zh: '斑马', pic: '🦓', say: 'The zebra is black and white.' },
        { en: 'snake', zh: '蛇', pic: '🐍', say: 'The snake is long.' }
      ]
    },
    {
      id: 'family', en: 'Family', zh: '家人', pic: '👨‍👩‍👧', ask: "Who's this?",
      words: [
        { en: 'mum', zh: '妈妈', pic: '👩', say: 'This is my mum.' },
        { en: 'dad', zh: '爸爸', pic: '👨', say: 'This is my dad.' },
        { en: 'brother', zh: '哥哥/弟弟', pic: '👦', say: 'This is my brother.' },
        { en: 'sister', zh: '姐姐/妹妹', pic: '👧', say: 'This is my sister.' },
        { en: 'baby', zh: '宝宝', pic: '👶', say: 'The baby is small.' },
        { en: 'grandma', zh: '奶奶/外婆', pic: '👵', say: 'I love my grandma.' },
        { en: 'grandpa', zh: '爷爷/外公', pic: '👴', say: 'I love my grandpa.' },
        { en: 'friend', zh: '朋友', pic: '🧑‍🤝‍🧑', say: 'This is my friend.' },
        { en: 'family', zh: '家庭', pic: '👨‍👩‍👧‍👦', say: 'I love my family.' }
      ]
    },
    {
      id: 'body', en: 'My Body', zh: '身体', pic: '🙆',
      words: [
        { en: 'head', zh: '头', pic: '🙆', say: 'Touch your head.' },
        { en: 'face', zh: '脸', pic: '😊', say: 'Wash your face.' },
        { en: 'eyes', ask: 'What are these?', zh: '眼睛', pic: '👀', say: "I've got two eyes." },
        { en: 'ears', ask: 'What are these?', zh: '耳朵', pic: '👂', say: "I've got two ears." },
        { en: 'nose', zh: '鼻子', pic: '👃', say: 'Touch your nose.' },
        { en: 'mouth', zh: '嘴巴', pic: '👄', say: 'Open your mouth.' },
        { en: 'teeth', ask: 'What are these?', zh: '牙齿', pic: '🦷', say: 'Brush your teeth.' },
        { en: 'hair', zh: '头发', pic: '💇', say: 'My hair is black.' },
        { en: 'hand', zh: '手', pic: '✋', say: 'Wave your hand.' },
        { en: 'arm', zh: '胳膊', pic: '💪', say: 'Move your arms.' },
        { en: 'leg', zh: '腿', pic: '🦵', say: "I've got two legs." },
        { en: 'foot', zh: '脚', pic: '🦶', say: 'This is my foot.' }
      ]
    },
    {
      id: 'school', en: 'School', zh: '学校', pic: '🏫',
      words: [
        { en: 'school', zh: '学校', pic: '🏫', say: 'I go to school.' },
        { en: 'teacher', zh: '老师', pic: '🧑‍🏫', say: 'This is my teacher.' },
        { en: 'book', zh: '书', pic: '📖', say: 'Open your book.' },
        { en: 'pen', zh: '钢笔', pic: '🖊️', say: 'This is my pen.' },
        { en: 'pencil', zh: '铅笔', pic: '✏️', say: "I've got a pencil." },
        { en: 'crayon', zh: '蜡笔', pic: '🖍️', say: "I've got a red crayon." },
        { en: 'ruler', zh: '尺子', pic: '📏', say: "It's a ruler." },
        { en: 'bag', zh: '书包', pic: '🎒', say: 'My bag is blue.' },
        { en: 'chair', zh: '椅子', pic: '🪑', say: 'Sit on the chair.' },
        { en: 'scissors', ask: 'What are these?', zh: '剪刀', pic: '✂️', say: 'Here are my scissors.' }
      ]
    },
    {
      id: 'toys', en: 'Toys', zh: '玩具', pic: '🧸',
      words: [
        { en: 'ball', zh: '球', pic: '⚽', say: "I've got a ball." },
        { en: 'teddy bear', zh: '泰迪熊', pic: '🧸', say: 'I like my teddy bear.' },
        { en: 'doll', zh: '娃娃', pic: '🪆', say: 'This is my doll.' },
        { en: 'car', zh: '小汽车', pic: '🚗', say: 'The car is fast.' },
        { en: 'train', zh: '火车', pic: '🚂', say: 'The train is long.' },
        { en: 'plane', zh: '飞机', pic: '✈️', say: 'The plane can fly.' },
        { en: 'boat', zh: '小船', pic: '⛵', say: 'The boat is on the water.' },
        { en: 'kite', zh: '风筝', pic: '🪁', say: "Let's fly a kite." },
        { en: 'robot', zh: '机器人', pic: '🤖', say: 'My robot can walk.' },
        { en: 'bike', zh: '自行车', pic: '🚲', say: 'I can ride a bike.' },
        { en: 'balloon', zh: '气球', pic: '🎈', say: 'The balloon is red.' }
      ]
    },
    {
      id: 'food', en: 'Food', zh: '食物', pic: '🍎',
      words: [
        { en: 'apple', zh: '苹果', pic: '🍎', say: 'I like apples.' },
        { en: 'banana', zh: '香蕉', pic: '🍌', say: 'Monkeys like bananas.' },
        { en: 'orange', zh: '橙子', pic: '🍊', say: "It's an orange." },
        { en: 'grapes', ask: 'What are these?', zh: '葡萄', pic: '🍇', say: 'I like grapes.' },
        { en: 'carrot', zh: '胡萝卜', pic: '🥕', say: 'Rabbits like carrots.' },
        { en: 'bread', zh: '面包', pic: '🍞', say: 'Can I have some bread, please?' },
        { en: 'egg', zh: '鸡蛋', pic: '🥚', say: "It's an egg." },
        { en: 'rice', zh: '米饭', pic: '🍚', say: 'I like rice.' },
        { en: 'chicken', zh: '鸡肉', pic: '🍗', say: 'I like chicken.' },
        { en: 'cake', zh: '蛋糕', pic: '🍰', say: 'Do you like cake?' },
        { en: 'ice cream', zh: '冰淇淋', pic: '🍦', say: 'I like ice cream.' },
        { en: 'milk', zh: '牛奶', pic: '🥛', say: 'Can I have some milk, please?' },
        { en: 'water', zh: '水', pic: '💧', say: "I'm thirsty. Water, please." },
        { en: 'juice', zh: '果汁', pic: '🧃', say: 'I like orange juice.' }
      ]
    },
    {
      id: 'clothes', en: 'Clothes', zh: '衣服', pic: '👕',
      words: [
        { en: 'hat', zh: '帽子', pic: '👒', say: 'Put on your hat.' },
        { en: 'T-shirt', zh: 'T 恤', pic: '👕', say: 'My T-shirt is blue.' },
        { en: 'dress', zh: '连衣裙', pic: '👗', say: 'I like your dress.' },
        { en: 'trousers', ask: 'What are these?', zh: '长裤', pic: '👖', say: 'These are my trousers.' },
        { en: 'shorts', ask: 'What are these?', zh: '短裤', pic: '🩳', say: 'I like my shorts.' },
        { en: 'socks', ask: 'What are these?', zh: '袜子', pic: '🧦', say: 'My socks are white.' },
        { en: 'shoes', ask: 'What are these?', zh: '鞋子', pic: '👟', say: 'Put on your shoes.' },
        { en: 'jacket', zh: '夹克', pic: '🧥', say: 'Put on your jacket.' },
        { en: 'scarf', zh: '围巾', pic: '🧣', say: "I've got a scarf." },
        { en: 'gloves', ask: 'What are these?', zh: '手套', pic: '🧤', say: 'My gloves are red.' }
      ]
    },
    {
      id: 'home', en: 'My Home', zh: '家', pic: '🏠',
      words: [
        { en: 'house', zh: '房子', pic: '🏠', say: 'This is my house.' },
        { en: 'door', zh: '门', pic: '🚪', say: 'Open the door, please.' },
        { en: 'window', zh: '窗户', pic: '🪟', say: 'Close the window, please.' },
        { en: 'bed', zh: '床', pic: '🛏️', say: "It's time for bed." },
        { en: 'sofa', zh: '沙发', pic: '🛋️', say: 'Sit on the sofa.' },
        { en: 'bath', zh: '浴缸', pic: '🛁', say: "I'm in the bath." },
        { en: 'TV', zh: '电视', pic: '📺', say: "Let's watch TV." },
        { en: 'clock', zh: '钟', pic: '🕰️', say: 'Look at the clock.' },
        { en: 'box', zh: '盒子', pic: '📦', say: 'The box is big.' },
        { en: 'lamp', zh: '台灯', pic: '💡', say: 'Turn on the lamp.' }
      ]
    }
  ],

  /*
   * 句型练习：有 q 的是「问答」（App 提问，孩子回答 a），只有 a 的是「跟读」。
   * {name} / {age} 会替换成家长设置里的孩子英文名和年龄。
   */
  sentences: [
    { id: 'h1', theme: 'hello', pic: '👋', q: "Hello! What's your name?", a: 'My name is {name}.' },
    { id: 'h2', theme: 'hello', pic: '🎂', q: 'How old are you?', a: "I'm {age}." },
    { id: 'h3', theme: 'hello', pic: '😊', q: 'How are you?', a: "I'm fine, thank you." },
    { id: 'h4', theme: 'hello', pic: '🌞', a: 'Good morning, teacher!' },
    { id: 'c1', theme: 'colours', pic: '🍎', q: 'What colour is it?', a: "It's red." },
    { id: 'c2', theme: 'colours', pic: '🐸', q: 'What colour is it?', a: "It's green." },
    { id: 'c3', theme: 'colours', pic: '💙', a: 'My favourite colour is blue.' },
    { id: 'n1', theme: 'numbers', pic: '🐱', count: 3, q: 'How many cats?', a: 'Three cats.' },
    { id: 'n2', theme: 'numbers', pic: '🍎', count: 5, q: 'How many apples?', a: 'Five apples.' },
    { id: 'n3', theme: 'numbers', pic: '🖐️', a: 'One, two, three, four, five!' },
    { id: 'a1', theme: 'animals', pic: '🐶', q: "What's this?", a: "It's a dog." },
    { id: 'a2', theme: 'animals', pic: '🐘', q: "What's this?", a: "It's an elephant." },
    { id: 'a3', theme: 'animals', pic: '🐦', q: 'Can a bird fly?', a: 'Yes, it can.' },
    { id: 'a4', theme: 'animals', pic: '🐵', a: 'I like monkeys.' },
    { id: 'f1', theme: 'family', pic: '👩', q: "Who's she?", a: "She's my mum." },
    { id: 'f2', theme: 'family', pic: '👴', q: "Who's he?", a: "He's my grandpa." },
    { id: 'f3', theme: 'family', pic: '👨‍👩‍👧‍👦', a: 'This is my family.' },
    { id: 'b1', theme: 'body', pic: '👃', a: 'Touch your nose.' },
    { id: 'b2', theme: 'body', pic: '👀', q: 'How many eyes have you got?', a: "I've got two eyes." },
    { id: 's1', theme: 'school', pic: '✏️', q: "What's this?", a: "It's a pencil." },
    { id: 's2', theme: 'school', pic: '📏', q: 'Have you got a ruler?', a: 'Yes, I have.' },
    { id: 's3', theme: 'school', pic: '📖', a: 'Open your book, please.' },
    { id: 't1', theme: 'toys', pic: '🪑⚽', q: "Where's the ball?", a: "It's under the chair." },
    { id: 't2', theme: 'toys', pic: '🤖', a: 'My favourite toy is my robot.' },
    { id: 't3', theme: 'toys', pic: '🪁', a: "Let's fly a kite!" },
    { id: 'd1', theme: 'food', pic: '🍎', q: 'Do you like apples?', a: 'Yes, I do.' },
    { id: 'd2', theme: 'food', pic: '🥕', q: 'Do you like carrots?', a: "No, I don't." },
    { id: 'd3', theme: 'food', pic: '🥛', a: 'Can I have some milk, please?' },
    { id: 'w1', theme: 'clothes', pic: '👟', a: 'Put on your shoes.' },
    { id: 'w2', theme: 'clothes', pic: '👕', q: 'What colour is your T-shirt?', a: 'My T-shirt is blue.' },
    { id: 'm1', theme: 'home', pic: '🛏️🐱', q: "Where's the cat?", a: "It's on the bed." },
    { id: 'm2', theme: 'home', pic: '🚪', a: 'Open the door, please.' }
  ],

  /* 原创小绘本：每页 scene 为插图（原型用 emoji 占位），text 为朗读句子 */
  stories: [
    {
      id: 'pip', title: "Hello, I'm Pip!", zh: '你好，我是皮普', cover: '🐧', tone: 'sky', themes: ['hello', 'numbers'],
      pages: [
        { scene: '🐧', text: "Hello! I'm Pip." },
        { scene: '🐧🎂', text: "I'm six." },
        { scene: '🐧🐟', text: 'I like fish!' },
        { scene: '🐧👋🐻', text: 'Hello, Bear! How are you?' },
        { scene: '🐻😊', text: "I'm fine, thank you!" },
        { scene: '🐧🐻⚽', text: "Let's play!" }
      ]
    },
    {
      id: 'cat', title: "Where's My Cat?", zh: '我的猫去哪儿了？', cover: '🐱', tone: 'sun', themes: ['home', 'animals'],
      pages: [
        { scene: '👧❓', text: "Where's my cat?" },
        { scene: '🛏️', text: 'Is it on the bed? No!' },
        { scene: '📦', text: 'Is it in the box? No!' },
        { scene: '🪑', text: 'Is it under the chair? No!' },
        { scene: '🛋️🐱', text: 'Is it on the sofa? Yes!' },
        { scene: '🐱💤', text: "Here's my cat. Shh! It's sleeping." }
      ]
    },
    {
      id: 'parade', title: 'Colour Parade', zh: '彩色大游行', cover: '🌈', tone: 'leaf', themes: ['colours', 'animals'],
      pages: [
        { scene: '🐸', text: 'A green frog. Hop, hop, hop!' },
        { scene: '🐤', text: 'A yellow chick. Cheep, cheep!' },
        { scene: '🐷', text: 'A pink pig. Oink, oink!' },
        { scene: '🐻', text: 'A brown bear. Grr!' },
        { scene: '🐳', text: 'A blue whale. Splash!' },
        { scene: '🌈', text: 'Red, yellow, green and blue. I can see a rainbow!' }
      ]
    },
    {
      id: 'lunch', title: 'Lunch Time', zh: '午饭时间', cover: '🐵', tone: 'berry', themes: ['food'],
      pages: [
        { scene: '🐵', text: "It's lunch time. I'm hungry!" },
        { scene: '🐵🍌', text: 'Bananas! I like bananas.' },
        { scene: '🐵🥕', text: "Carrots? No, thank you. I don't like carrots." },
        { scene: '🐻🍰', text: 'Cake! Do you like cake?' },
        { scene: '🐵😋', text: 'Yes, I do! Yum, yum!' },
        { scene: '🐵🥛', text: 'And milk, please. Thank you!' }
      ]
    },
    {
      id: 'ducks', title: 'Count the Ducks', zh: '数一数小鸭子', cover: '🦆', tone: 'sky', themes: ['numbers', 'animals'],
      pages: [
        { scene: '🦆', text: 'One little duck.' },
        { scene: '🦆🦆', text: 'Two little ducks.' },
        { scene: '🦆🦆🦆', text: 'Three little ducks.' },
        { scene: '🦆🦆🦆🦆', text: 'Four little ducks.' },
        { scene: '🦆🦆🦆🦆🦆', text: 'Five little ducks. Quack, quack, quack!' },
        { scene: '🌊🦆🌊', text: 'Swim, little ducks, swim!' }
      ]
    },
    {
      id: 'max', title: 'Get Dressed, Max!', zh: '麦克斯，穿衣服啦', cover: '👦', tone: 'grape', themes: ['clothes', 'family'],
      pages: [
        { scene: '👩👦', text: 'Good morning, Max! Get dressed, please.' },
        { scene: '👕', text: 'Put on your T-shirt.' },
        { scene: '👖', text: 'Put on your trousers.' },
        { scene: '🧦', text: 'Put on your socks.' },
        { scene: '👟', text: 'Put on your shoes.' },
        { scene: '👦😄', text: "I'm ready, Mum! Let's go!" }
      ]
    }
  ],

  /* 动起来（TPR）：听指令做动作 */
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

  /* 视频角推荐片单：链接到 B 站搜索，家长挑选正版/官方上传的版本 */
  videos: [
    { title: 'Maisy Mouse', zh: '小鼠波波', accent: '英音', level: '入门', mins: '5 分钟/集', why: '画面简单、语速慢、句子极短，零基础首选', q: 'Maisy Mouse 英文' },
    { title: 'Super Simple Songs', zh: '超级简单儿歌', accent: '美音', level: '入门', mins: '2–3 分钟/首', why: '儿歌配动作，边唱边做，适合磨耳朵', q: 'Super Simple Songs' },
    { title: 'Peppa Pig', zh: '小猪佩奇', accent: '英音', level: '入门–初级', mins: '5 分钟/集', why: '家庭生活场景，句型和 Power Up 主题高度重合', q: 'Peppa Pig 英文版' },
    { title: 'Sarah & Duck', zh: '莎拉和乖乖鸭', accent: '英音', level: '入门–初级', mins: '7 分钟/集', why: '节奏慢、对白少而清楚', q: 'Sarah and Duck 英文' },
    { title: 'Alphablocks', zh: '字母积木', accent: '英音', level: '入门–初级', mins: '3 分钟/集', why: 'BBC 出品，字母和自然拼读启蒙', q: 'Alphablocks' },
    { title: 'Numberblocks', zh: '数字积木', accent: '英音', level: '初级', mins: '5 分钟/集', why: 'BBC 出品，数字和数数', q: 'Numberblocks' },
    { title: 'Hey Duggee', zh: '嗨道奇', accent: '英音', level: '初级', mins: '7 分钟/集', why: '剧情有趣，语速稍快，适合第 4 个月以后', q: 'Hey Duggee 英文' }
  ],

  /* 贴纸墙：每完成一天的路线解锁一张 */
  stickers: ['🦁', '🐼', '🦊', '🐨', '🐯', '🦄', '🐙', '🦋', '🐢', '🦉', '🐬', '🦒', '🐞', '🦜', '🐳', '🦩',
    '🐝', '🦔', '🐧', '🦓', '🐰', '🦕', '🐠', '🐿️', '🦦', '🐌', '🦚', '🐮', '🐲', '🦭'],

  praise: {
    3: ['Excellent!', 'Super!', 'Wonderful!', 'Fantastic!'],
    2: ['Good job!', 'Well done!', 'Very good!'],
    1: ['Nice try!', 'Good try!', 'Keep going!']
  }
};
