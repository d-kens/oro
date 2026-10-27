/* Paipa roadmaps: the skills to learn for a role, in order. A step whose slug matches a skill in src/data/skills.js
   links to it; any other step is shown as planned. */
export const ROADMAPS = [
  {
    slug: 'devops', name: 'DevOps engineer',
    summary: 'Build, ship and run software: the servers it runs on, the pipelines that test and release it, and the platforms that keep it running.',
    steps: [
      ['what-is-devops', 'What is DevOps'],
      ['linux', 'Linux'],
      ['shell-scripting', 'Shell scripting'],
      ['python-for-devops', 'Python for DevOps'],
      ['git', 'Git'],
      ['networking', 'Networking'],
      ['nginx', 'Nginx'],
      ['docker', 'Docker'],
      ['aws', 'AWS'],
      ['terraform', 'Terraform'],
      ['github-actions', 'GitHub Actions'],
      ['kubernetes', 'Kubernetes'],
      ['helm', 'Helm'],
      ['argo-cd', 'Argo CD'],
      ['observability', 'Observability'],
      ['devsecops', 'DevSecOps'],
      ['capstone', 'Capstone']
    ]
  }
];
