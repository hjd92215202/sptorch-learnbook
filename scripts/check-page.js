const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const htmlPath = path.resolve(process.argv[2] || 'index.html');
  const url = 'file://' + htmlPath;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = [];
  const checks = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto(url);
  await page.waitForTimeout(800);
  const nav = await page.locator('.ni').count();
  const title = await page.locator('.lt').textContent();

  if (nav !== 26) {
    errors.push(`Expected 26 navigation items, got ${nav}`);
  }

  const advancedExercises = [
    {
      lesson: 21,
      title: '数学与代码学习路线',
      id: 'e21',
      taskText: '找到公式对应函数',
      answers: [
        'matmul / transpose / LoRALinear',
        'backward / chain_rule',
        'softmax / cross_entropy',
      ],
    },
    {
      lesson: 22,
      title: 'LLaMA 级架构升级',
      id: 'e22',
      taskText: '接入 Q/K',
      answers: [
        'x1 * cos - x2 * sin',
        'x1 * sin + x2 * cos',
      ],
    },
    {
      lesson: 23,
      title: '显存与并行切分',
      id: 'e23',
      taskText: '统计账本',
      answers: [
        'P + G + M + V',
        'P + (G + M + V) / N',
      ],
    },
    {
      lesson: 24,
      title: 'FlashAttention 与量化',
      id: 'e24',
      taskText: '合并分母',
      answers: [
        'max(m_old, m_block)',
        'exp(m_old - m_new) * l_old + exp(m_block - m_new) * l_block',
        'scale * (x_q - zero_point)',
      ],
    },
    {
      lesson: 25,
      title: '持续学习与 DPO',
      id: 'e25',
      taskText: '记录偏好样本',
      answers: [
        'logp_chosen - logp_ref_chosen',
        'logp_rejected - logp_ref_rejected',
        '-log_sigmoid(beta * (chosen_adv - rejected_adv))',
      ],
    },
  ];

  for (const item of advancedExercises) {
    await page.locator(`[data-l="${item.lesson}"]`).click();
    await page.waitForTimeout(250);
    const currentTitle = await page.locator('.lt').textContent();
    const exercise = page.locator(`#ex_${item.id}`);
    const visible = await exercise.isVisible();
    const taskVisible = await page.locator('h2', { hasText: '代码落地任务' }).isVisible();
    const taskTextVisible = await page.locator('text=' + item.taskText).first().isVisible();

    if (currentTitle !== item.title) {
      errors.push(`Lesson ${item.lesson} title mismatch: expected ${item.title}, got ${currentTitle}`);
    }
    if (!taskVisible || !taskTextVisible) {
      errors.push(`Lesson ${item.lesson} code task is missing expected text: ${item.taskText}`);
    }
    if (!visible) {
      errors.push(`Exercise ${item.id} is not visible`);
      continue;
    }

    for (let i = 0; i < item.answers.length; i += 1) {
      await page.locator(`#exb_${item.id}_${i}`).fill(item.answers[i]);
    }
    await page.locator(`#ex_${item.id} .ex-run`).click();
    const feedback = await page.locator(`#exf_${item.id}`).textContent();
    const passed = feedback.includes('完全正确');
    if (!passed) {
      errors.push(`Exercise ${item.id} did not validate: ${feedback}`);
    }
    checks.push({
      lesson: item.lesson,
      title: currentTitle,
      exercise: item.id,
      visible,
      taskVisible,
      passed,
    });
  }

  const finalTitle = await page.locator('.lt').textContent();
  const dpoVisible = await page.locator('text=DPO').first().isVisible();
  console.log(JSON.stringify({ title, finalTitle, nav, dpoVisible, checks, errors }, null, 2));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})();
