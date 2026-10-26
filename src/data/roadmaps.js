/* Paipa roadmaps: the skills to learn for a role, in order. A step whose slug matches a skill in src/data/skills.js
   links to it; any other step is shown as planned. */
export const ROADMAPS = [
  {
    slug: 'devops', name: 'DevOps engineer',
    summary: 'Build, ship and run software: the servers it runs on, the pipelines that test and release it, and the platforms that keep it running.',
    steps: [
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
  },
  {
    slug: 'cloud', name: 'Cloud engineer',
    summary: 'Build and run systems on AWS: the networks, servers, storage and services they use, who can reach them, what they cost and how they survive failure.',
    steps: [
      ['cloud-computing', 'What is cloud computing'],
      ['linux', 'Linux'],
      ['shell-scripting', 'Shell scripting'],
      ['networking', 'Networking'],
      ['git', 'Git'],
      ['aws-fundamentals', 'AWS fundamentals'],
      ['aws-iam', 'IAM'],
      ['aws-ec2', 'EC2'],
      ['aws-vpc', 'VPC'],
      ['aws-s3', 'S3'],
      ['aws-databases', 'Databases'],
      ['aws-messaging', 'Messaging'],
      ['aws-serverless', 'Serverless'],
      ['docker', 'Docker'],
      ['aws-ecs', 'ECS on Fargate'],
      ['terraform', 'Terraform'],
      ['aws-monitoring', 'Monitoring and auditing'],
      ['aws-security', 'Security'],
      ['aws-architecture', 'Cost and architecture'],
      ['cloud-capstone', 'Capstone']
    ]
  }
];
