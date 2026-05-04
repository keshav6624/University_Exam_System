const systemGuidance = {
  student: 'You help students use the university exam platform, including courses, exams, results, and login issues.',
  teacher: 'You help teachers manage courses, create exams, grade submissions, and understand analytics.',
  admin: 'You help administrators manage departments, users, logs, and system-wide workflows.',
  guest: 'You help users understand the university exam platform and its main features.',
};

const quickReplies = [
  'How do I log in?',
  'How do I start an exam?',
  'How do teachers create exams?',
  'How do I check results?',
];

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const buildLocalReply = (message, role) => {
  const text = normalizeText(message);

  if (!text) return 'Please type a question so I can help.';
  if (/(hello|hi|hey|good morning|good afternoon|good evening)/.test(text)) {
    return `Hello${role ? ` ${role}` : ''}. I can help with exam system tasks, login issues, and navigation.`;
  }
  if (/(login|sign in|password|otp|account)/.test(text)) {
    return 'Use your registered university email and password to sign in. If your account is suspended or the password is wrong, contact an admin or reset your credentials if that flow is enabled.';
  }
  if (/(exam|test|quiz|attempt|submit)/.test(text)) {
    return 'Students can open the Exams page, start an active exam, answer questions, and submit before time expires. Teachers can create and publish exams from the teacher portal.';
  }
  if (/(result|score|grade|grading|marks)/.test(text)) {
    return 'Students can review results after publication. Teachers can grade submissions and publish results from the grading and exam screens.';
  }
  if (/(course|subject|class)/.test(text)) {
    return 'Courses are managed from the role-specific dashboard. Students can view enrolled courses, teachers can manage course assignments, and admins can maintain department structure.';
  }
  if (/(admin|department|user|teacher|student|log)/.test(text)) {
    return 'Admins can manage departments, teachers, students, courses, and system logs from the admin portal.';
  }

  return 'I can help with login, exams, results, courses, and role-specific workflows. Try asking about one of those topics.';
};

const getNimReply = async ({ message, role, history = [] }) => {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) return null;

  const model = process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.1-8b-instruct';
  const baseUrl = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
  const messages = [
    {
      role: 'system',
      content: [
        'You are the UniExam assistant for a university online examination platform.',
        'Stay focused on the product: login, courses, exams, grading, results, dashboard navigation, and account issues.',
        'Be concise, practical, and role-aware.',
        `User role: ${role || 'guest'}.`,
        systemGuidance[role] || systemGuidance.guest,
        'If the user asks for something unrelated to the platform, politely redirect them back to the exam system.',
      ].join(' '),
    },
    ...history
      .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
      .slice(-10)
      .map((item) => ({ role: item.role, content: item.content })),
    { role: 'user', content: message },
  ];

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 250,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`NVIDIA NIM request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
};

const sendMessage = async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    const role = req.user?.role || 'guest';

    const reply = (await getNimReply({ message, role, history })) || buildLocalReply(message, role);

    res.json({
      success: true,
      reply,
      source: process.env.NVIDIA_NIM_API_KEY ? 'nim' : 'local',
      suggestions: quickReplies,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendMessage };