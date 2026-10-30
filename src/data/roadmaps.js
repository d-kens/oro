/* Oro roadmaps: the skills to learn for a role, in order, grouped into stages. A step whose slug matches a skill in
   src/data/skills.js links to it; any other step is shown as planned. Each roadmap also gets a flat list of its
   steps, in order, as steps. */
const roadmap = (r) => ({ ...r, steps: r.stages.flatMap((s) => s.steps) });

export const ROADMAPS = [
  roadmap({
    slug: 'devops', name: 'DevOps engineer',
    summary: 'Build, ship and run software: the servers it runs on, the pipelines that test and release it, and the platforms that keep it running.',
    stages: [
      { name: 'Foundations', steps: [
        ['what-is-devops', 'What is DevOps'],
        ['linux', 'Linux'],
        ['shell-scripting', 'Shell scripting'],
        ['python-for-devops', 'Python for DevOps'],
        ['git', 'Git'],
        ['networking', 'Networking']
      ] },
      { name: 'Containers and cloud', steps: [
        ['docker', 'Docker'],
        ['cloud-computing', 'Cloud computing'],
        ['aws', 'AWS']
      ] },
      { name: 'Automation', steps: [
        ['terraform', 'Terraform'],
        ['github-actions', 'GitHub Actions']
      ] },
      { name: 'Running at scale', steps: [
        ['kubernetes', 'Kubernetes'],
        ['helm', 'Helm'],
        ['argo-cd', 'Argo CD']
      ] },
      { name: 'Operating safely', steps: [
        ['observability', 'Observability'],
        ['devsecops', 'DevSecOps']
      ] },
      { name: 'Capstone', steps: [
        ['capstone', 'Capstone']
      ] }
    ]
  })
];
