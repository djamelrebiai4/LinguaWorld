/**
 * ============================================================
 * German Life Simulator (Deutsches Lebens-Simulations-System)
 * NPCs, Personalities, Friendships, Jobs, Real Estate & Daily Life
 * ============================================================
 */

(function () {
  'use strict';

  // 1. Life State & Persistence
  const LifeState = {
    money: parseInt(localStorage.getItem('de_life_money') || '350', 10),
    energy: parseInt(localStorage.getItem('de_life_energy') || '100', 10),
    timeOfDay: localStorage.getItem('de_life_time') || 'Nachmittag ☀️',
    properties: JSON.parse(localStorage.getItem('de_life_properties') || '[]'),
    inventory: JSON.parse(localStorage.getItem('de_life_inventory') || '["Kaffee ☕", "Buch 📖"]'),
    activeNpcKey: null,

    save() {
      localStorage.setItem('de_life_money', this.money.toString());
      localStorage.setItem('de_life_energy', this.energy.toString());
      localStorage.setItem('de_life_time', this.timeOfDay);
      localStorage.setItem('de_life_properties', JSON.stringify(this.properties));
      localStorage.setItem('de_life_inventory', JSON.stringify(this.inventory));
      this.updateHUD();
    },

    addMoney(amount, reason) {
      this.money += amount;
      this.save();
      if (window.GermanEngine && window.GermanEngine.State) {
        window.GermanEngine.State.addXP(Math.round(amount / 2), reason);
      }
      playSFX('Correct');
      showToast(`💶 +${amount} €: ${reason}`);
    },

    spendMoney(amount, reason) {
      if (this.money < amount) {
        showToast(`⚠️ ليس لديك رصيد كافٍ! تحتاج إلى ${amount} €`);
        playSFX('Wrong');
        return false;
      }
      this.money -= amount;
      this.save();
      showToast(`💸 تم دفع ${amount} €: ${reason}`);
      playSFX('DoorOpen');
      return true;
    },

    useEnergy(amount) {
      this.energy = Math.max(0, this.energy - amount);
      this.save();
    },

    restoreEnergy() {
      this.energy = 100;
      this.save();
      playSFX('LessonComplete');
      showToast('⚡ استعدت طاقتك بالكامل بعد الراحة والنوم!');
    },

    updateHUD() {
      const moneyEl = document.getElementById('de-life-money-val');
      if (moneyEl) moneyEl.textContent = `${this.money} €`;
      const energyEl = document.getElementById('de-life-energy-val');
      if (energyEl) energyEl.textContent = `${this.energy}%`;
      const timeEl = document.getElementById('de-life-time-val');
      if (timeEl) timeEl.textContent = this.timeOfDay;
    }
  };

  // 2. Sound Effects
  function playSFX(name) {
    try {
      const audio = new Audio(`/Sounds/${name}.mp3`);
      audio.volume = 0.45;
      audio.play().catch(() => {});
    } catch(e) {}
  }

  // 3. Toast notifications
  function showToast(message) {
    const old = document.querySelector('.de-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'de-toast';
    toast.innerHTML = `<span>🇩🇪</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // 4. Speech Helper
  function speak(text) {
    if (window.GermanEngine && window.GermanEngine.speakGerman) {
      window.GermanEngine.speakGerman(text);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 0.88;
      window.speechSynthesis.speak(u);
    }
  }

  // 5. NPCs with Mentality, Personality, Mood & Friendships
  const NPCS = {
    sophie: {
      id: 'sophie',
      name: 'Sophie Müller',
      role: 'Die Barista & Studentin (المقهى والمطعم)',
      world: 'Restaurant',
      avatar: '☕',
      personality: 'Lebensfroh, herzlich & kunstbegeistert (مبتهجة ومحبة للفن واللغات)',
      mood: 'Glücklich 😊',
      friendship: parseInt(localStorage.getItem('de_npc_sophie_fr') || '30', 10),
      topics: ['Reisen & Kultur', 'Kaffee & Rezepte', 'Literatur'],
      dialogue: {
        greeting: 'Hallo! Schön dich zu sehen! Wie war dein Tag bis jetzt?',
        greeting_ar: 'مرحباً! يسعدني جداً لقاؤك! كيف كان يومك حتى الآن؟',
        responses: [
          {
            de: 'Sehr schön, danke! Ich lerne gerade fleißig Deutsch.',
            ar: 'جميل جداً، شكراً لكِ! أنا أتعلم الألمانية بجد الآن.',
            friendshipBonus: 15,
            reply: 'Das ist wunderbar! Übung macht den Meister! 🌟',
            reply_ar: 'هذا رائع! بالممارسة يولد المعلم المتقن!'
          },
          {
            de: 'Etwas anstrengend, aber ein guter Kaffee bei dir hilft immer!',
            ar: 'مرهق قليلاً، لكن فنجان قهوة جيد من صنعك يساعد دائماً!',
            friendshipBonus: 20,
            reply: 'Aww, vielen Dank! Für dich mache ich den besten Cappuccino der Stadt! ☕',
            reply_ar: 'شكراً جزيلاً! سأعد لك أفضل كابتشينو في المدينة بأسرها!'
          }
        ]
      }
    },
    lukas: {
      id: 'lukas',
      name: 'Lukas Wagner',
      role: 'Der Architektur-Student (الفصل الدراسي والمدينة)',
      world: 'Classroom',
      avatar: '📐',
      personality: 'Ehrgeizig, technikbegeistert & neugierig (طموح، شغوف بالهندسة والتكنولوجيا)',
      mood: 'Konzentriert & Begeistert 🤩',
      friendship: parseInt(localStorage.getItem('de_npc_lukas_fr') || '20', 10),
      topics: ['Moderne Architektur', 'Tech & Gaming', 'Zukunftspläne'],
      dialogue: {
        greeting: 'Hey! Schau mal, ich zeichne gerade den Entwurf für ein nachhaltiges Gebäude.',
        greeting_ar: 'مرحباً! انظر، أنا أرسم الآن مخططاً لمبنى صديق للبيئة ومستدام.',
        responses: [
          {
            de: 'Das sieht beeindruckend aus! Wie lange arbeitest du schon daran?',
            ar: 'يبدو تصميماً مبهراً حقاً! كم لك تعمل عليه؟',
            friendshipBonus: 20,
            reply: 'Seit zwei Wochen Tag und Nacht! Dein Lob motiviert mich sehr! 🏛️',
            reply_ar: 'منذ أسبوعين ليلاً ونهاراً! مديحك يحفزني كثيراً!'
          },
          {
            de: 'Gute Architektur macht eine Stadt lebenswert.',
            ar: 'الهندسة المعمارية الجيدة تجعل المدينة مكاناً يستحق العيش فيه.',
            friendshipBonus: 15,
            reply: 'Exakt meine Philosophie! Du verstehst mich wirklich gut.',
            reply_ar: 'هذه فلسفتي بالضبط! أنت تفهمني جيداً حقاً.'
          }
        ]
      }
    },
    herr_weber: {
      id: 'herr_weber',
      name: 'Herr Heinrich Weber',
      role: 'Der Nachbar & Rentner (المنزل والحديقة)',
      world: 'House',
      avatar: '👴',
      personality: 'Pünktlich, traditionell, weicher Kern (محب للانضباط والهدوء، طيب في داخله)',
      mood: 'Nachdenklich 🤔',
      friendship: parseInt(localStorage.getItem('de_npc_weber_fr') || '10', 10),
      topics: ['Pünktlichkeit & Ordnung', 'Gartenpflege', 'Geschichte'],
      dialogue: {
        greeting: 'Guten Tag, junger Nachbar. Ist bei Ihnen im Haus alles in bester Ordnung?',
        greeting_ar: 'طاب يومك يا جاري العزيز. هل كل شيء في منزلك على أفضل ما يرام؟',
        responses: [
          {
            de: 'Guten Tag, Herr Weber! Ja, alles ruhig und sauber, vielen Dank der Nachfrage.',
            ar: 'طاب يومك سيد فيبر! نعم، كل شيء هادئ ونظيف، شكراً جزيلاً لسؤالك.',
            friendshipBonus: 25,
            reply: 'Sehr vorbildlich! Ein ruhiger Nachbar ist heutzutage Gold wert. 🤝',
            reply_ar: 'مثالي للغاية! الجار الهادئ هذه الأيام كنز من ذهب.'
          },
          {
            de: 'Ihr Garten sieht heute wieder wunderschön gepflegt aus!',
            ar: 'حديقتك تبدو اليوم معتنى بها وجميلة كالعادة!',
            friendshipBonus: 20,
            reply: 'Oh, bemerken Sie das? Fleiß und Geduld zahlen sich eben aus!',
            reply_ar: 'أوه، هل لاحظت ذلك؟ الاجتهاد والصبر يؤتيان ثمارهما دوماً!'
          }
        ]
      }
    },
    hanna: {
      id: 'hanna',
      name: 'Hanna Schneider',
      role: 'Die Filialleiterin (السوبرماركت)',
      world: 'Supermarket',
      avatar: '💼',
      personality: 'Strukturiert, effizient, liebt frische Küche (منظمة، عملية، تعشق الطبخ الصحي)',
      mood: 'Etwas gestresst 😤',
      friendship: parseInt(localStorage.getItem('de_npc_hanna_fr') || '15', 10),
      topics: ['Gesunde Ernährung', 'Qualitätsprodukte', 'Business & Logistik'],
      dialogue: {
        greeting: 'Hallo! Wir haben heute frische Bio-Lieferungen bekommen. Suchen Sie etwas Bestimmtes?',
        greeting_ar: 'مرحباً! لقد وصلتنا اليوم شحنات عضوية طازجة. هل تبحث عن شيء معين؟',
        responses: [
          {
            de: 'Ja, ich koche heute Abend und suche frisches Gemüse und Obst.',
            ar: 'نعم، سأطبخ الليلة وأبحث عن خضروات وفواكه طازجة.',
            friendshipBonus: 20,
            reply: 'Hervorragend! Die Bio-Äpfel und der Spinat sind heute erstklassig! 🍎',
            reply_ar: 'ممتاز! التفاح العضوي والسبانخ اليوم من الدرجة الأولى!'
          },
          {
            de: 'Lassen Sie sich nicht zu sehr stressen! Sie machen hier tolle Arbeit.',
            ar: 'لا ترهقي نفسك كثيراً! أنتِ تقومين بعمل رائع هنا.',
            friendshipBonus: 25,
            reply: 'Danke... Das tat wirklich gut zu hören nach so einem langen Arbeitstag. 😊',
            reply_ar: 'شكراً لك... كان سماع ذلك جميلاً ومريحاً حقاً بعد يوم عمل طويل.'
          }
        ]
      }
    },
    max: {
      id: 'max',
      name: 'Max Becker',
      role: 'Der Fitnesstrainer (شوارع المدينة والرياضة)',
      world: 'City',
      avatar: '🏃',
      personality: 'Sportlich, enthusiastisch & motivierend (رياضي، مفعم بالحماس والطاقة الإيجابية)',
      mood: 'Voller Energie ⚡',
      friendship: parseInt(localStorage.getItem('de_npc_max_fr') || '25', 10),
      topics: ['Fitness & Ausdauer', 'Ernährung', 'Motivation'],
      dialogue: {
        greeting: 'Servus! Bist du heute schon deine zehn Kilometer gelaufen oder mit dem Rad gefahren?',
        greeting_ar: 'مرحباً! هل ركضت اليوم كيلومتراتك العشرة أو قدت دراجتك الهوائية؟',
        responses: [
          {
            de: 'Ich bin die ganze Stadt zu Fuß abgelaufen, um Deutsch zu lernen!',
            ar: 'لقد مشيت في المدينة بأكملها وأنا أتعلم الألمانية!',
            friendshipBonus: 20,
            reply: 'Stark! Geistiges und körperliches Training kombiniert – beste Methode! 💪',
            reply_ar: 'رائع جداً! جمعت بين تدريب العقل والجسد – أفضل طريقة على الإطلاق!'
          },
          {
            de: 'Gleich nachher! Ein gesunder Geist wohnt in einem gesunden Körper.',
            ar: 'سأفعل ذلك بعد قليل! العقل السليم في الجسم السليم.',
            friendshipBonus: 25,
            reply: 'Mens sana in corpore sano! Auf dich ist Verlass, Kumpel!',
            reply_ar: 'العقل السليم في الجسم السليم! يُعتمد عليك يا صديقي!'
          }
        ]
      }
    }
  };

  function getFriendshipStatus(points) {
    if (points >= 90) return 'Bester Freund (صديق مقرب جداً 💖)';
    if (points >= 60) return 'Guter Freund (صديق حميم 🤝)';
    if (points >= 35) return 'Kumpel (رفيق مرح ☕)';
    if (points >= 15) return 'Bekannter (معارف 👤)';
    return 'Fremder (شخص غريب ⚪)';
  }

  // 6. Job Center System
  const JOBS = [
    {
      id: 'job_waiter',
      title: 'Kellner im Restaurant (نادل في المطعم)',
      world: 'Restaurant',
      icon: '🍽️',
      desc: 'خدمة الزبائن، تدوين الطلبات بالألمانية وحساب الفاتورة.',
      wage: 80,
      energyCost: 25,
      tasks: [
        'Gast: "Ich hätte gerne ein Schnitzel mit Pommes und eine Cola."',
        'Du antwortest höflich: "Sehr gerne, kommt sofort!"',
        'Rechnung erstellen und Trinkgeld kassieren.'
      ],
      miniGame: [
        {
          customerSays: 'Kann ich bitte die Speisekarte haben?',
          customerSays_ar: 'هل يمكنني الحصول على قائمة الطعام من فضلك؟',
          correct: { de: 'Natürlich! Einen Moment, bitte.', ar: 'بالطبع! لحظة من فضلك.' },
          wrong: { de: 'Nein, das geht nicht.', ar: 'لا، هذا غير ممكن.' }
        },
        {
          customerSays: 'Ich hätte gerne ein Schnitzel mit Pommes, bitte.',
          customerSays_ar: 'أرغب في شنيتزل مع البطاطس المقلية من فضلك.',
          correct: { de: 'Sehr gerne! Kommt sofort.', ar: 'بكل سرور! سيأتي فوراً.' },
          wrong: { de: 'Das haben wir leider nicht.', ar: 'للأسف ليس لدينا هذا.' }
        },
        {
          customerSays: 'Darf ich bitte die Rechnung haben?',
          customerSays_ar: 'هل يمكنني الحصول على الفاتورة من فضلك؟',
          correct: { de: 'Natürlich, einen Moment bitte. Das macht 18 Euro.', ar: 'بالطبع، لحظة من فضلك. المجموع 18 يورو.' },
          wrong: { de: 'Wir machen jetzt Feierabend.', ar: 'انتهى وقت عملنا الآن.' }
        }
      ]
    },
    {
      id: 'job_cashier',
      title: 'Kassierer im Supermarkt (كاشير في السوبرماركت)',
      world: 'Supermarket',
      icon: '🛒',
      desc: 'مسح الباركود، التحقق من بطاقات الولاء، ومحاسبة العملاء بالألمانية.',
      wage: 75,
      energyCost: 20,
      tasks: [
        'Kunde: "Kann ich mit Karte zahlen?"',
        'Du: "Ja, natürlich. Bitte die Karte auflegen."',
        'Kassenbon aushändigen: "Einen schönen Tag noch!"'
      ],
      miniGame: [
        {
          customerSays: 'Haben Sie eine Kundenkarte?',
          customerSays_ar: 'هل لديك بطاقة ولاء العملاء؟',
          correct: { de: 'Ja, haben Sie eine Kundenkarte dabei?', ar: 'نعم، هل تحمل بطاقة العملاء معك؟' },
          wrong: { de: 'Das ist mir egal.', ar: 'هذا لا يعنيني.' }
        },
        {
          customerSays: 'Kann ich mit Karte zahlen?',
          customerSays_ar: 'هل يمكنني الدفع ببطاقة الائتمان؟',
          correct: { de: 'Ja, natürlich. Bitte die Karte auflegen.', ar: 'نعم، بالطبع. ضع البطاقة على القارئ من فضلك.' },
          wrong: { de: 'Nein, nur Bargeld.', ar: 'لا، نقداً فقط.' }
        },
        {
          customerSays: 'Kann ich bitte eine Tüte haben?',
          customerSays_ar: 'هل يمكنني الحصول على كيس من فضلك؟',
          correct: { de: 'Ja, das kostet 20 Cent. Hier ist Ihre Tüte.', ar: 'نعم، تكلف 20 سنت. هذه كيستك.' },
          wrong: { de: 'Wir haben keine Tüten mehr.', ar: 'لم يتبق لدينا أكياس.' }
        }
      ]
    },
    {
      id: 'job_guide',
      title: 'Stadtführer in der Altstadt (مرشد سياحي في المدينة)',
      world: 'City',
      icon: '🏛️',
      desc: 'قيادة مجموعة سياحية وشرح معالم المدينة التاريخية باللغة الألمانية.',
      wage: 110,
      energyCost: 35,
      tasks: [
        'Erkläre den Weg zum Brandenburger Tor und zur Kathedrale.',
        'Beantworte Fragen der Touristen auf Deutsch.',
        'Sorge für gute Stimmung in der Gruppe.'
      ],
      miniGame: [
        {
          customerSays: 'Wie weit ist es zum Brandenburger Tor?',
          customerSays_ar: 'كم المسافة إلى بوابة براندنبورغ؟',
          correct: { de: 'Es sind nur etwa fünf Gehminuten von hier.', ar: 'حوالي خمس دقائق سيراً على الأقدام من هنا.' },
          wrong: { de: 'Das weiß ich auch nicht.', ar: 'لا أعرف أيضاً.' }
        },
        {
          customerSays: 'Wann wurde dieser Platz erbaut?',
          customerSays_ar: 'متى تم بناء هذه الساحة؟',
          correct: { de: 'Diese Sehenswürdigkeit wurde im 18. Jahrhundert erbaut.', ar: 'بني هذا المعلم في القرن الثامن عشر.' },
          wrong: { de: 'Keine Ahnung, ich bin neu hier.', ar: 'لا أعرف، أنا جديد هنا.' }
        },
        {
          customerSays: 'Dürfen wir hier Fotos machen?',
          customerSays_ar: 'هل يُسمح لنا بالتصوير هنا؟',
          correct: { de: 'Ja, natürlich! Das ist ein wunderschönes Fotomotiv.', ar: 'نعم، بالطبع! هذا موضوع تصوير رائع.' },
          wrong: { de: 'Nein, das ist streng verboten.', ar: 'لا، هذا محظور تماماً.' }
        }
      ]
    }
  ];

  // 7. Real Estate & Housing System
  const PROPERTIES = [
    {
      id: 'prop_wg',
      title: 'Zimmer in Studenten-WG (غرفة بسكن مشترك)',
      price: 250,
      icon: '🛏️',
      desc: 'غرفة مريحة ومفروشة في شقة طلابية مشتركة قريبة من الجامعة والخدمات.',
      perks: 'توفر مكاناً للراحة والنوم لاستعادة الطاقة يومياً.'
    },
    {
      id: 'prop_apartment',
      title: 'Moderne 2-Zimmer-Wohnung (شقة أنيقة في المدينة)',
      price: 950,
      icon: '🏢',
      desc: 'شقة حديثة ومستقلة مع شرفة جميلة ومطبخ ألماني مجهز بالكامل.',
      perks: 'مكان هادئ، إمكانية دعوة الأصدقاء لتناول القهوة والدردشة.'
    },
    {
      id: 'prop_house',
      title: 'Einfamilienhaus mit Garten (منزل عائلي مع حديقة)',
      price: 2800,
      icon: '🏡',
      desc: 'منزل فسيح مع حديقة خاصة خضراء، ومكان للشواء، وغرف متعددة.',
      perks: 'لقب "Hauseigentümer" المرموق، دعوة الأصدقاء لحفلات شواء بالألمانية.'
    }
  ];

  // 8. Render Life HUD Top/Side Bar
  function renderLifeHUD() {
    if (document.getElementById('de-life-top-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'de-life-top-hud';
    hud.className = 'de-life-hud';
    hud.innerHTML = `
      <div class="de-life-stat money" title="رصيدك المالي الحالي باليورو">
        <span>💶</span> <span id="de-life-money-val">${LifeState.money} €</span>
      </div>
      <div class="de-life-stat energy" title="مستوى الطاقة">
        <span>⚡</span> <span id="de-life-energy-val">${LifeState.energy}%</span>
      </div>
      <div class="de-life-stat" title="وقت اليوم">
        <span id="de-life-time-val">${LifeState.timeOfDay}</span>
      </div>
      <button class="de-life-btn highlight" id="de-open-life-btn" title="افتح قائمة الحياة الاجتماعية والوظائف">
        <span>🏙️</span> <span>Meine Welt (عالمي)</span>
      </button>
    `;
    document.body.appendChild(hud);

    document.getElementById('de-open-life-btn').addEventListener('click', () => {
      openLifeModal('friends');
    });
  }

  // 9. Floating NPC In-World Beacon
  function renderWorldNPCBeacon() {
    const world = (window.location.pathname.toLowerCase().match(/(supermarket|restaurant|city|house|classroom)/) || [])[1];
    if (!world) return;
    if (document.getElementById('de-npc-world-beacon')) return;

    // Find matching NPC for this world
    const worldKey = world.charAt(0).toUpperCase() + world.slice(1);
    const npcKey = Object.keys(NPCS).find(k => NPCS[k].world.toLowerCase() === world.toLowerCase());
    if (!npcKey) return;

    const npc = NPCS[npcKey];
    const btn = document.createElement('button');
    btn.id = 'de-npc-world-beacon';
    btn.className = 'de-world-npc-beacon';
    btn.innerHTML = `
      <span>${npc.avatar}</span>
      <span>${npc.avatar} ${npc.name.split(' ')[0]} (${npc.mood.split(' ')[1] || '😊'})</span>
    `;
    btn.addEventListener('click', () => {
      openNPCConversation(npcKey);
    });
    document.body.appendChild(btn);
  }

  // 10. Open Life Simulation Modal (Tabs: Friends, Work, Real Estate)
  function openLifeModal(defaultTab = 'friends') {
    const old = document.querySelector('.de-life-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'de-life-modal-overlay';
    overlay.innerHTML = `
      <div class="de-life-modal">
        <div class="de-life-header">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:28px;">🏙️</span>
            <div>
              <div style="font-size:20px; font-weight:900;">Das Leben in Deutschland (الحياة اليومية)</div>
              <div style="font-size:13px; color:#94a3b8; font-weight:600;">صداقات، وظائف، عقارات، وأنشطة حقيقية</div>
            </div>
          </div>
          <button class="de-modal-close" style="color:white; background:rgba(255,255,255,0.15);" id="de-life-close-btn">&times;</button>
        </div>

        <div class="de-life-tabs">
          <button class="de-life-tab ${defaultTab === 'friends' ? 'active' : ''}" data-tab="friends">
            <span>👥</span> <span>Freunde & Kontakte (الأصدقاء)</span>
          </button>
          <button class="de-life-tab ${defaultTab === 'work' ? 'active' : ''}" data-tab="work">
            <span>💼</span> <span>Arbeit & Geld (العمل والدخل)</span>
          </button>
          <button class="de-life-tab ${defaultTab === 'housing' ? 'active' : ''}" data-tab="housing">
            <span>🏡</span> <span>Immobilien (شراء المنازل)</span>
          </button>
          <button class="de-life-tab ${defaultTab === 'routine' ? 'active' : ''}" data-tab="routine">
            <span>🛌</span> <span>Tagesablauf (الراحة والروتين)</span>
          </button>
          <button class="de-life-tab ${defaultTab === 'tagesaufgabe' ? 'active' : ''}" data-tab="tagesaufgabe">
            <span>📅</span> <span>Tagesaufgabe (التحدي اليومي)</span>
          </button>
        </div>

        <div class="de-life-content" id="de-life-tab-content">
          <!-- Populated by JS -->
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('de-life-close-btn').addEventListener('click', () => overlay.remove());

    overlay.querySelectorAll('.de-life-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        overlay.querySelectorAll('.de-life-tab').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');
        renderTabContent(tabBtn.getAttribute('data-tab'));
      });
    });

    renderTabContent(defaultTab);
  }

  function renderTabContent(tab) {
    const container = document.getElementById('de-life-tab-content');
    if (!container) return;

    if (tab === 'friends') {
      container.innerHTML = `
        <div style="margin-bottom:16px;">
          <h3 style="margin:0 0 4px; font-size:18px; font-weight:900; color:#0f172a;">دائرة معارفك في ألمانيا</h3>
          <p style="margin:0; font-size:13px; color:#64748b;">لكل شخصية طبيعة، مزاج، واهتمامات مختلفة. تحدث معهم لبناء صداقات حقيقية!</p>
        </div>
        <div class="de-npc-grid">
          ${Object.keys(NPCS).map(key => {
            const npc = NPCS[key];
            const frStatus = getFriendshipStatus(npc.friendship);
            return `
              <div class="de-npc-card">
                <div class="de-npc-card-header">
                  <div class="de-npc-avatar-wrap">
                    <div class="de-npc-avatar">${npc.avatar}</div>
                    <div>
                      <div class="de-npc-name">${npc.name}</div>
                      <div class="de-npc-role">${npc.role}</div>
                    </div>
                  </div>
                  <span class="de-npc-mood-badge">${npc.mood}</span>
                </div>
                <div class="de-npc-personality">💡 <b>الشخصية:</b> ${npc.personality}</div>
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:800; color:#475569;">
                    <span>علاقة الصداقة:</span>
                    <span>${frStatus} (${npc.friendship}/100)</span>
                  </div>
                  <div class="de-npc-friendship-bar">
                    <div class="de-npc-friendship-fill" style="width:${Math.min(100, npc.friendship)}%;"></div>
                  </div>
                </div>
                <button class="de-npc-action-btn" data-npckey="${key}">
                  <span>💬</span> <span>دردشة وبناء صداقة (Unterhalten)</span>
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;

      container.querySelectorAll('.de-npc-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-npckey');
          openNPCConversation(key);
        });
      });

    } else if (tab === 'work') {
      container.innerHTML = `
        <div style="margin-bottom:18px;">
          <h3 style="margin:0 0 4px; font-size:18px; font-weight:900; color:#0f172a;">مكتب التوظيف والعمل اليومي (Arbeitsamt)</h3>
          <p style="margin:0; font-size:13px; color:#64748b;">اعمل في وظائف حقيقية لكسب اليورو 💶 وممارسة الألمانية المهنية!</p>
        </div>
        <div>
          ${JOBS.map(job => `
            <div class="de-job-card">
              <div style="font-size:36px; padding:10px; background:#f1f5f9; border-radius:18px;">${job.icon}</div>
              <div class="de-job-info" style="flex:1;">
                <h4>${job.title}</h4>
                <p>${job.desc}</p>
                <div style="display:flex; gap:10px; align-items:center;">
                  <span class="de-job-wage">💶 +${job.wage} € / نوبة عمل</span>
                  <span style="font-size:12px; color:#d97706; font-weight:700;">⚡ تستهلك ${job.energyCost}% طاقة</span>
                </div>
              </div>
              <button class="de-job-work-btn" data-jobid="${job.id}">
                <span>💼</span> <span>بدء العمل الآن</span>
              </button>
            </div>
          `).join('')}
        </div>
      `;

      container.querySelectorAll('.de-job-work-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const jobId = btn.getAttribute('data-jobid');
          performJob(jobId);
        });
      });

    } else if (tab === 'housing') {
      container.innerHTML = `
        <div style="margin-bottom:18px;">
          <h3 style="margin:0 0 4px; font-size:18px; font-weight:900; color:#0f172a;">سوق العقارات وشراء المنازل (Immobilienmarkt)</h3>
          <p style="margin:0; font-size:13px; color:#64748b;">اشترِ منزلك الخاص في ألمانيا، أسّس غرفك، واستمتع بالاستقرار والراحة!</p>
        </div>
        <div>
          ${PROPERTIES.map(prop => {
            const isOwned = LifeState.properties.includes(prop.id);
            return `
              <div class="de-property-card">
                <div style="font-size:40px; padding:12px; background:#f1f5f9; border-radius:20px;">${prop.icon}</div>
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                    <h4 style="margin:0; font-size:17px; font-weight:900; color:#0f172a;">${prop.title}</h4>
                    ${isOwned ? '<span class="de-property-owned-badge">✓ مملوك لك</span>' : ''}
                  </div>
                  <p style="margin:0 0 6px; font-size:13px; color:#64748b;">${prop.desc}</p>
                  <div style="font-size:12px; color:#2563eb; font-weight:700;">✨ ${prop.perks}</div>
                </div>
                <div>
                  ${isOwned ? `
                    <button class="de-life-btn" style="padding:10px 18px; font-weight:800;" disabled>
                      🏡 منزلك الحالي
                    </button>
                  ` : `
                    <button class="de-buy-btn" data-propid="${prop.id}">
                      <span>💶</span> <span>شراء (${prop.price} €)</span>
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      container.querySelectorAll('.de-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const propId = btn.getAttribute('data-propid');
          buyProperty(propId);
        });
      });

    } else if (tab === 'routine') {
      container.innerHTML = `
        <div style="margin-bottom:18px;">
          <h3 style="margin:0 0 4px; font-size:18px; font-weight:900; color:#0f172a;">الروتين اليومي والراحة (Tagesablauf)</h3>
          <p style="margin:0; font-size:13px; color:#64748b;">النوم والراحة يستعيدان طاقتك بنسبة 100% لتتمكن من العمل والدراسة بنشاط!</p>
        </div>
        <div style="background:#f8fafc; border-radius:22px; padding:24px; border:1.5px solid #e2e8f0; text-align:center;">
          <div style="font-size:52px; margin-bottom:12px;">🛌</div>
          <h4 style="margin:0 0 8px; font-size:20px; font-weight:900; color:#0f172a;">Schlafen & Ausruhen (النوم والراحة في المنزل)</h4>
          <p style="font-size:14px; color:#64748b; max-width:400px; margin:0 auto 20px;">
            هل تشعر بالتعب بعد يوم طويل من العمل ودراسة الألمانية؟ خذ قسطاً كافياً من الراحة الآن.
          </p>
          <button class="de-action-btn de-btn-speak" style="margin:0 auto; max-width:260px;" id="de-rest-btn">
            <span>✨</span> <span>الخلود إلى النوم والراحة (استعادة الطاقة 100%)</span>
          </button>
        </div>
      `;

      document.getElementById('de-rest-btn').addEventListener('click', () => {
        LifeState.restoreEnergy();
        renderTabContent('routine');
      });
    } else if (tab === 'tagesaufgabe') {
      const today = new Date().toDateString();
      let dailyData = JSON.parse(localStorage.getItem('de_daily_challenge') || '{}');
      if (dailyData.date !== today) {
        dailyData = { date: today, completed: [false, false, false], bonusGiven: false };
        localStorage.setItem('de_daily_challenge', JSON.stringify(dailyData));
      }

      const challenges = [
        { icon: '📚', title: 'تعلم 5 كلمات جديدة اليوم', desc: 'Lerne heute 5 neue Vokabeln auf Deutsch' },
        { icon: '💬', title: 'أتمم محادثة واحدة كاملة', desc: 'Führe ein vollständiges Gespräch mit einem NPC' },
        { icon: '💼', title: 'اعمل في وظيفة اليوم', desc: 'Arbeite heute in einem Job und verdiene Geld' }
      ];

      const allDone = dailyData.completed.every(Boolean);
      container.innerHTML = `
        <div style="margin-bottom:18px;">
          <h3 style="margin:0 0 4px; font-size:18px; font-weight:900; color:#0f172a;">Tagesaufgaben (تحديات اليوم)</h3>
          <p style="margin:0; font-size:13px; color:#64748b;">أتمم التحديات اليومية الثلاثة لتحصل على مكافأة 200 XP إضافية!</p>
        </div>
        <div style="background:#fffbeb; border:1.5px solid #fde68a; border-radius:16px; padding:14px 18px; margin-bottom:16px; font-size:13px; font-weight:700; color:#92400e;">
          📅 تحدي اليوم: <b>${today}</b>
        </div>
        ${challenges.map((ch, i) => `
          <div class="de-daily-challenge-card">
            <div class="de-challenge-check ${dailyData.completed[i] ? 'done' : ''}" data-idx="${i}" id="de-challenge-check-${i}">
              ${dailyData.completed[i] ? '✓' : ''}
            </div>
            <div style="font-size:28px;">${ch.icon}</div>
            <div style="flex:1;">
              <div style="font-weight:900; font-size:15px; color:#0f172a;">${ch.title}</div>
              <div style="font-size:12px; color:#64748b; font-weight:600;">${ch.desc}</div>
            </div>
            ${dailyData.completed[i] ? '<span style="font-size:11px;font-weight:800;color:#059669;background:#dcfce7;padding:3px 8px;border-radius:10px;">✓ أُنجز</span>' : ''}
          </div>
        `).join('')}
        ${allDone ? `
          <div style="text-align:center; padding:20px; background:linear-gradient(135deg,#f0fdf4,#dcfce7); border-radius:18px; margin-top:12px;">
            <div style="font-size:40px; margin-bottom:8px;">🏆</div>
            <div style="font-weight:900; font-size:16px; color:#059669;">مبروك! أنجزت جميع تحديات اليوم!</div>
            <div style="font-size:13px; color:#15803d; font-weight:700;">+200 XP مكافأة اليوم</div>
          </div>
        ` : ''}
      `;

      container.querySelectorAll('.de-challenge-check:not(.done)').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          dailyData.completed[idx] = true;
          localStorage.setItem('de_daily_challenge', JSON.stringify(dailyData));
          playSFX('Correct');
          showToast(`✅ أحسنت! أنجزت التحدي: ${challenges[idx].title}`);
          if (dailyData.completed.every(Boolean) && !dailyData.bonusGiven) {
            dailyData.bonusGiven = true;
            localStorage.setItem('de_daily_challenge', JSON.stringify(dailyData));
            if (window.GermanEngine && window.GermanEngine.State) {
              window.GermanEngine.State.addXP(200, 'إنجاز جميع تحديات اليوم!');
            }
            showToast('🏆 +200 XP مكافأة إنجاز تحديات اليوم!');
          }
          renderTabContent('tagesaufgabe');
        });
      });
    }
  }

  // 11. NPC Social Chat Window
  function openNPCConversation(npcKey) {
    const npc = NPCS[npcKey];
    if (!npc) return;

    const old = document.querySelector('.de-dialogue-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'de-dialogue-overlay';
    overlay.innerHTML = `
      <div class="de-dialogue-box">
        <div class="de-dialogue-top" style="background:linear-gradient(135deg, #0284c7, #0f172a);">
          <div class="de-dialogue-title-wrap">
            <div class="de-dialogue-avatar" style="background:#38bdf8;">${npc.avatar}</div>
            <div>
              <div class="de-dialogue-speaker-name">${npc.name}</div>
              <div class="de-dialogue-sub">${npc.role} • المزاج: ${npc.mood}</div>
            </div>
          </div>
          <button class="de-modal-close" style="color:white; background:rgba(255,255,255,0.2);" id="de-npc-chat-close">&times;</button>
        </div>
        <div class="de-dialogue-body" id="de-npc-chat-body">
          <div class="de-npc-speech-bubble">
            <div class="de-speech-text-de">${npc.dialogue.greeting}</div>
            <div class="de-speech-text-ar">${npc.dialogue.greeting_ar}</div>
            <button class="de-speech-listen-btn" id="de-npc-voice-btn">
              <span>🔊</span> <span>استمع للنطق الألماني</span>
            </button>
          </div>

          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:14px; padding:10px 14px; font-size:12px; font-weight:700; color:#15803d;">
            🤝 <b>مستوى الصداقة الحالي:</b> ${getFriendshipStatus(npc.friendship)} (${npc.friendship}/100)
          </div>

          <div>
            <div class="de-choices-header">اختر ردك للتحدث مع ${npc.name.split(' ')[0]}:</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${npc.dialogue.responses.map((res, i) => `
                <div class="de-choice-option" data-resp-idx="${i}">
                  <div style="text-align:left;">
                    <div class="de-choice-de">${res.de}</div>
                    <div class="de-choice-ar">${res.ar}</div>
                  </div>
                  <div class="de-choice-speak-icon">💬</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    speak(npc.dialogue.greeting);

    document.getElementById('de-npc-chat-close').addEventListener('click', () => overlay.remove());
    document.getElementById('de-npc-voice-btn').addEventListener('click', () => speak(npc.dialogue.greeting));

    overlay.querySelectorAll('.de-choice-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const idx = parseInt(opt.getAttribute('data-resp-idx'), 10);
        const resp = npc.dialogue.responses[idx];

        // Award friendship
        npc.friendship = Math.min(100, npc.friendship + resp.friendshipBonus);
        localStorage.setItem(`de_npc_${npcKey}_fr`, npc.friendship.toString());
        playSFX('Correct');
        speak(resp.reply);

        if (window.GermanEngine && window.GermanEngine.State) {
          window.GermanEngine.State.addXP(40, `حوار وتوطيد صداقة مع ${npc.name.split(' ')[0]}`);
        }

        const body = document.getElementById('de-npc-chat-body');
        body.innerHTML = `
          <div class="de-npc-speech-bubble" style="background:#eff6ff; border-color:#bfdbfe;">
            <div style="font-size:12px; font-weight:800; color:#2563eb; margin-bottom:4px;">رد ${npc.name.split(' ')[0]}:</div>
            <div class="de-speech-text-de">${resp.reply}</div>
            <div class="de-speech-text-ar">${resp.reply_ar}</div>
          </div>
          <div style="text-align:center; padding:18px;">
            <div style="font-size:32px; margin-bottom:8px;">💖</div>
            <div style="font-weight:900; color:#059669; font-size:16px;">
              +${resp.friendshipBonus} نقاط صداقة! أصبحتم الآن: "${getFriendshipStatus(npc.friendship)}"
            </div>
          </div>
          <button class="de-action-btn de-btn-listen" style="margin:0 auto; max-width:200px;" id="de-npc-finish-chat">
            <span>✓</span> <span>إغلاق المحادثة</span>
          </button>
        `;

        document.getElementById('de-npc-finish-chat').addEventListener('click', () => overlay.remove());
      });
    });
  }

  // 12. Perform Job
  function performJob(jobId) {
    const job = JOBS.find(j => j.id === jobId);
    if (!job) return;

    if (LifeState.energy < job.energyCost) {
      showToast(`⚠️ طاقتك منخفضة جداً (${LifeState.energy}%)! خذ قسطاً من الراحة أولاً.`);
      playSFX('Wrong');
      return;
    }

    LifeState.useEnergy(job.energyCost);
    LifeState.addMoney(job.wage, `راتب العمل كـ ${job.title.split(' ')[0]}`);
    playSFX('LessonComplete');

    alert(`🎉 أحسنت صنعاً في عملك كـ (${job.title})!\n\nأنجزت مهام العمل بنجاح وكسبت +${job.wage} € واستهلكت ${job.energyCost}% من طاقتك.`);
    renderTabContent('work');
  }

  // 13. Buy Real Estate Property
  function buyProperty(propId) {
    const prop = PROPERTIES.find(p => p.id === propId);
    if (!prop) return;

    if (LifeState.properties.includes(propId)) {
      showToast('أنت تملك هذا العقار بالفعل!');
      return;
    }

    const ok = LifeState.spendMoney(prop.price, `شراء ${prop.title.split(' ')[0]}`);
    if (ok) {
      LifeState.properties.push(propId);
      LifeState.save();
      if (window.GermanEngine && window.GermanEngine.State) {
        window.GermanEngine.State.addXP(300, `شراء عقار: ${prop.title}`);
      }
      playSFX('LessonComplete');
      alert(`🎉 مبروك! أصبحت الآن مالكاً رسمياً لـ: ${prop.title}!\n\nتمت إضافة العقار إلى أملاكك بنجاح.`);
      renderTabContent('housing');
    }
  }

  // 14. Initialize
  function init() {
    renderLifeHUD();
    renderWorldNPCBeacon();
    console.log('✅ German Life Simulator (Deutsches Lebens-System) active!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GermanLife = {
    LifeState,
    NPCS,
    JOBS,
    PROPERTIES,
    openLifeModal,
    openNPCConversation
  };

})();
