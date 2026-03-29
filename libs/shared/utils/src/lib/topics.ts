export const TOPICS = [
  { value: 'machine-learning', label: 'Machine Learning' },
  { value: 'artificial-intelligence', label: 'AI' },
  { value: 'deep-learning', label: 'Deep Learning' },
  { value: 'llm', label: 'LLM' },
  { value: 'devops', label: 'DevOps' },
  { value: 'docker', label: 'Docker' },
  { value: 'kubernetes', label: 'Kubernetes' },
  { value: 'serverless', label: 'Serverless' },
  { value: 'react', label: 'React' },
  { value: 'angular', label: 'Angular' },
  { value: 'vue', label: 'Vue' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'cli', label: 'CLI' },
  { value: 'database', label: 'Database' },
  { value: 'api', label: 'API' },
  { value: 'security', label: 'Security' },
  { value: 'testing', label: 'Testing' },
  { value: 'blockchain', label: 'Blockchain' },
  { value: 'web3', label: 'Web3' },
  { value: 'game-development', label: 'Game Dev' },
] as const;

export type TopicValue = (typeof TOPICS)[number]['value'];
