/* Paipa roadmaps: the skills to learn for a role, in order. A step whose slug matches a skill in src/data/skills.js
   links to it; any other step is shown as planned. */
export const ROADMAPS = [
  {
    slug: 'devops', name: 'DevOps engineer',
    summary: 'Build, ship and run software: the servers it runs on, the pipelines that test and release it, and the platforms that keep it running.',
    steps: [
      ['linux', 'Linux'],
      ['networking', 'Networking'],
      ['shell-scripting', 'Shell scripting'],
      ['git', 'Git'],
      ['docker', 'Docker'],
      ['kubernetes', 'Kubernetes'],
      ['helm', 'Helm'],
      ['argo-cd', 'Argo CD'],
      ['github-actions', 'GitHub Actions'],
      ['terraform', 'Terraform'],
      ['python-for-devops', 'Python for DevOps'],
      ['go-for-devops', 'Go for DevOps']
    ]
  }
];
