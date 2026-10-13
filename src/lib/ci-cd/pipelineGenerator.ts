"use client";

export type PipelineFormat = "github-actions" | "gitlab-ci" | "azure-devops" | "circleci" | "jenkins";

export interface PipelineOptions {
  format: PipelineFormat;
  environment: string;
  provider: "aws" | "azure" | "gcp";
  region: string;
  terraformVersion?: string;
  nodeVersion?: string;
  pythonVersion?: string;
  includeSecurityScan?: boolean;
  includeCostEstimation?: boolean;
  includePolicyCheck?: boolean;
  autoApprove?: boolean;
  branches?: string[];
  manualApproval?: boolean;
}

export interface PipelineResult {
  files: Record<string, string>;
  mainFile: string;
  format: PipelineFormat;
  explanation: string;
}

export const PIPELINE_FORMATS: { value: PipelineFormat; label: string; description: string }[] = [
  { value: "github-actions", label: "GitHub Actions", description: "YAML workflows for GitHub Actions" },
  { value: "gitlab-ci", label: "GitLab CI/CD", description: "YAML pipelines for GitLab CI/CD" },
  { value: "azure-devops", label: "Azure DevOps", description: "YAML pipelines for Azure DevOps" },
  { value: "circleci", label: "CircleCI", description: "YAML configuration for CircleCI" },
  { value: "jenkins", label: "Jenkins", description: "Jenkinsfile (Groovy DSL)" },
];

function generateGitHubActions(options: PipelineOptions): PipelineResult {
  const files: Record<string, string> = {};
  const env = options.environment;
  const provider = options.provider;
  const region = options.region;
  const terraformVersion = options.terraformVersion || "1.7.0";
  const branches = options.branches || ["main", "develop"];

  // Terraform workflow
  files[".github/workflows/terraform.yml"] = `name: Terraform ${env}

on:
  push:
    branches: [${branches.map(b => `"${b}"`).join(", ")}]
  pull_request:
    branches: [${branches.map(b => `"${b}"`).join(", ")}]

env:
  TF_VERSION: "${terraformVersion}"
  TF_VAR_environment: "${env}"
  TF_VAR_region: "${region}"
  AWS_REGION: "${region}"

permissions:
  contents: read
  pull-requests: write

jobs:
  validate:
    name: Validate
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./terraform
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: \${{ env.TF_VERSION }}

      - name: Initialize Terraform
        run: terraform init -backend=false

      - name: Validate Terraform
        run: terraform validate

      - name: Format Check
        run: terraform fmt -check -recursive

  plan:
    name: Plan
    needs: validate
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./terraform
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: \${{ env.TF_VERSION }}

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Initialize Terraform
        run: terraform init

      - name: Terraform Plan
        id: plan
        run: terraform plan -out=tfplan -var="environment=\${{ env.TF_VAR_environment }}" -var="region=\${{ env.TF_VAR_region }}"

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan-\${{ env.TF_VAR_environment }}
          path: terraform/tfplan

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('terraform/tfplan', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Terraform Plan\\n\`\`\`\\n' + plan + '\\n\`\`\`'
            })
  ${options.includeCostEstimation ? `
  cost-estimation:
    name: Cost Estimation
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan-\${{ env.TF_VAR_environment }}
          path: terraform/

      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: \${{ secrets.INFRACOST_API_KEY }}

      - name: Generate Cost Estimate
        run: |
          infracost breakdown --path terraform/tfplan --format json --out-file infracost.json
          infracost comment github --path infracost.json --repo \$GITHUB_REPOSITORY --pull-request \$PR_NUMBER --github-token \$GITHUB_TOKEN
        env:
          PR_NUMBER: \${{ github.event.pull_request.number || github.event.number }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
` : ""}
  ${options.includePolicyCheck ? `
  policy-check:
    name: Policy Check (OPA)
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan-\${{ env.TF_VAR_environment }}
          path: terraform/

      - name: Setup OPA
        uses: open-policy-agent/opa-action@v1

      - name: Run Policy Checks
        run: |
          terraform show -json terraform/tfplan > plan.json
          opa eval --data policies --input plan.json "data.terraform.deny"
` : ""}
  ${options.includeSecurityScan ? `
  security-scan:
    name: Security Scan
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan-\${{ env.TF_VAR_environment }}
          path: terraform/

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1
        with:
          working-directory: terraform

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform
          framework: terraform
` : ""}
  apply:
    name: Apply
    needs: [plan${options.includeCostEstimation ? ", cost-estimation" : ""}${options.includePolicyCheck ? ", policy-check" : ""}${options.includeSecurityScan ? ", security-scan" : ""}]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./terraform
    ${options.manualApproval ? `
    environment: ${env}
    ` : ""}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan-\${{ env.TF_VAR_environment }}
          path: terraform/

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: \${{ env.TF_VERSION }}

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
`;

  // Destroy workflow
  files[".github/workflows/terraform-destroy.yml"] = `name: Terraform Destroy ${env}

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "DESTROY" to confirm'
        required: true
        type: string

env:
  TF_VERSION: "${terraformVersion}"
  TF_VAR_environment: "${env}"
  TF_VAR_region: "${region}"
  AWS_REGION: "${region}"

jobs:
  destroy:
    name: Destroy
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./terraform
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: \${{ env.TF_VERSION }}

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Initialize Terraform
        run: terraform init

      - name: Terraform Destroy
        run: terraform destroy -auto-approve -var="environment=\${{ env.TF_VAR_environment }}" -var="region=\${{ env.TF_VAR_region }}"
`;

  // PR workflow
  files[".github/workflows/pr-checks.yml"] = `name: PR Checks

on:
  pull_request:
    branches: [${branches.map(b => `"${b}"`).join(", ")}]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "${options.nodeVersion || "20"}"
      - run: npm ci
      - run: npm run lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "${options.nodeVersion || "20"}"
      - run: npm ci
      - run: npm run typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "${options.nodeVersion || "20"}"
      - run: npm ci
      - run: npm test
`;

  return {
    files,
    mainFile: ".github/workflows/terraform.yml",
    format: "github-actions",
    explanation: `Generated GitHub Actions workflows for ${env} environment with ${Object.keys(files).length} workflow files`
  };
}

function generateGitLabCI(options: PipelineOptions): PipelineResult {
  const files: Record<string, string> = {};
  const env = options.environment;
  const provider = options.provider;
  const region = options.region;
  const terraformVersion = options.terraformVersion || "1.7.0";

  files[".gitlab-ci.yml"] = `stages:
  - validate
  - plan
  ${options.includeCostEstimation ? "- cost-estimation" : ""}
  ${options.includePolicyCheck ? "- policy-check" : ""}
  ${options.includeSecurityScan ? "- security-scan" : ""}
  - apply

variables:
  TF_VERSION: "${terraformVersion}"
  TF_VAR_environment: "${env}"
  TF_VAR_region: "${region}"
  AWS_REGION: "${region}"
  AWS_DEFAULT_REGION: "${region}"

cache:
  paths:
    - .terraform/

before_script:
  - apk add --no-cache curl unzip
  - curl -fsSL https://releases.hashicorp.com/terraform/\${TF_VERSION}/terraform_\${TF_VERSION}_linux_amd64.zip -o terraform.zip
  - unzip terraform.zip -d /usr/local/bin/
  - terraform --version

validate:
  stage: validate
  script:
    - cd terraform
    - terraform init -backend=false
    - terraform validate
    - terraform fmt -check -recursive
  rules:
    - if: \$CI_PIPELINE_SOURCE == "merge_request_event"
    - if: \$CI_COMMIT_BRANCH == "main"
    - if: \$CI_COMMIT_BRANCH == "develop"

plan:
  stage: plan
  needs: [validate]
  script:
    - cd terraform
    - terraform init
    - terraform plan -out=tfplan -var="environment=\${TF_VAR_environment}" -var="region=\${TF_VAR_region}"
  artifacts:
    paths:
      - terraform/tfplan
    expire_in: 1 week
  rules:
    - if: \$CI_PIPELINE_SOURCE == "merge_request_event"
    - if: \$CI_COMMIT_BRANCH == "main"
    - if: \$CI_COMMIT_BRANCH == "develop"
  ${options.includeCostEstimation ? `
cost-estimation:
  stage: cost-estimation
  needs: [plan]
  image: infracost/infracost:latest
  variables:
    INFRACOST_API_KEY: \${INFRACOST_API_KEY}
  script:
    - cd terraform
    - infracost breakdown --path tfplan --format json --out-file infracost.json
    - infracost comment gitlab --path infracost.json --repo \$CI_PROJECT_PATH --merge-request \$CI_MERGE_REQUEST_IID --gitlab-token \$CI_JOB_TOKEN
  rules:
    - if: \$CI_PIPELINE_SOURCE == "merge_request_event"
` : ""}
  ${options.includePolicyCheck ? `
policy-check:
  stage: policy-check
  needs: [plan]
  image: openpolicyagent/opa:latest
  script:
    - cd terraform
    - terraform show -json tfplan > plan.json
    - opa eval --data /policies --input plan.json "data.terraform.deny"
  rules:
    - if: \$CI_PIPELINE_SOURCE == "merge_request_event"
    - if: \$CI_COMMIT_BRANCH == "main"
` : ""}
  ${options.includeSecurityScan ? `
security-scan:
  stage: security-scan
  needs: [plan]
  image: aquasec/tfsec:latest
  script:
    - cd terraform
    - tfsec .
  allow_failure: true
  rules:
    - if: \$CI_PIPELINE_SOURCE == "merge_request_event"
    - if: \$CI_COMMIT_BRANCH == "main"
` : ""}
apply:
  stage: apply
  needs: [plan${options.includeCostEstimation ? ", cost-estimation" : ""}${options.includePolicyCheck ? ", policy-check" : ""}${options.includeSecurityScan ? ", security-scan" : ""}]
  script:
    - cd terraform
    - terraform init
    - terraform apply -auto-approve tfplan
  environment:
    name: ${env}
    action: apply
  rules:
    - if: \$CI_COMMIT_BRANCH == "main"
      when: ${options.manualApproval ? "manual" : "on_success"}
    - if: \$CI_COMMIT_BRANCH == "develop"
      when: ${options.manualApproval ? "manual" : "on_success"}
`;

  return {
    files,
    mainFile: ".gitlab-ci.yml",
    format: "gitlab-ci",
    explanation: `Generated GitLab CI/CD pipeline for ${env} environment`
  };
}

function generateAzureDevOps(options: PipelineOptions): PipelineResult {
  const files: Record<string, string> = {};
  const env = options.environment;
  const provider = options.provider;
  const region = options.region;
  const terraformVersion = options.terraformVersion || "1.7.0";

  files["azure-pipelines.yml"] = `trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main
      - develop

variables:
  TF_VERSION: "${terraformVersion}"
  TF_VAR_environment: "${env}"
  TF_VAR_region: "${region}"
  AWS_REGION: "${region}"

stages:
  - stage: Validate
    displayName: "Validate Terraform"
    jobs:
      - job: Validate
        displayName: "Validate"
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - checkout: self
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: "\$(TF_VERSION)"
          - script: |
              cd terraform
              terraform init -backend=false
              terraform validate
              terraform fmt -check -recursive
            displayName: "Terraform Validate"

  - stage: Plan
    displayName: "Plan Terraform"
    dependsOn: Validate
    jobs:
      - job: Plan
        displayName: "Plan"
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - checkout: self
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: "\$(TF_VERSION)"
          - task: AWSShellScript@1
            inputs:
              awsCredentials: "aws-credentials"
              regionName: "\$(AWS_REGION)"
              scriptType: "inline"
              inlineScript: |
                cd terraform
                terraform init
                terraform plan -out=tfplan -var="environment=\$(TF_VAR_environment)" -var="region=\$(TF_VAR_region)"
          - publish: terraform/tfplan
            artifact: tfplan

  ${options.includeCostEstimation ? `
  - stage: CostEstimation
    displayName: "Cost Estimation"
    dependsOn: Plan
    jobs:
      - job: CostEstimation
        displayName: "Infracost"
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - checkout: self
          - download: current
            artifact: tfplan
          - script: |
              infracost breakdown --path terraform/tfplan --format json --out-file infracost.json
              infracost comment azure-devops --path infracost.json --repo \$(Build.Repository.Name) --pull-request \$(System.PullRequest.PullRequestId) --azure-devops-token \$(System.AccessToken)
            env:
              INFRACOST_API_KEY: \$(INFRACOST_API_KEY)
            displayName: "Infracost Breakdown"
` : ""}
  ${options.includePolicyCheck ? `
  - stage: PolicyCheck
    displayName: "Policy Check"
    dependsOn: Plan
    jobs:
      - job: PolicyCheck
        displayName: "OPA Policy Check"
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - checkout: self
          - download: current
            artifact: tfplan
          - script: |
              cd terraform
              terraform show -json tfplan > plan.json
              opa eval --data policies --input plan.json "data.terraform.deny"
            displayName: "OPA Policy Check"
` : ""}
  ${options.includeSecurityScan ? `
  - stage: SecurityScan
    displayName: "Security Scan"
    dependsOn: Plan
    jobs:
      - job: SecurityScan
        displayName: "Security Scan"
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - checkout: self
          - download: current
            artifact: tfplan
          - script: |
              cd terraform
              tfsec .
            displayName: "tfsec"
          - script: |
              checkov -d terraform --framework terraform
            displayName: "Checkov"
` : ""}
  - stage: Apply
    displayName: "Apply Terraform"
    dependsOn: Plan
    condition: and(succeeded(), or(eq(variables['Build.SourceBranch'], 'refs/heads/main'), eq(variables['Build.SourceBranch'], 'refs/heads/develop')))
    ${options.manualApproval ? `
    jobs:
      - job: WaitForApproval
        displayName: "Wait for Approval"
        pool: server
        timeoutInMinutes: 4320
        steps:
          - task: ManualValidation@1
            inputs:
              instructions: "Approve Terraform apply for ${env}?"
              onTimeout: "reject"
` : ""}
    jobs:
      - job: Apply
        displayName: "Apply"
        pool:
          vmImage: "ubuntu-latest"
        steps:
          - checkout: self
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: "\$(TF_VERSION)"
          - download: current
            artifact: tfplan
          - task: AWSShellScript@1
            inputs:
              awsCredentials: "aws-credentials"
              regionName: "\$(AWS_REGION)"
              scriptType: "inline"
              inlineScript: |
                cd terraform
                terraform init
                terraform apply -auto-approve tfplan
            displayName: "Terraform Apply"
`;

  return {
    files,
    mainFile: "azure-pipelines.yml",
    format: "azure-devops",
    explanation: `Generated Azure DevOps pipeline for ${env} environment`
  };
}

function generateCircleCI(options: PipelineOptions): PipelineResult {
  const files: Record<string, string> = {};
  const env = options.environment;
  const provider = options.provider;
  const region = options.region;
  const terraformVersion = options.terraformVersion || "1.7.0";

  files[".circleci/config.yml"] = `version: 2.1

orbs:
  aws-cli: circleci/aws-cli@3.1
  terraform: circleci/terraform@5.0

jobs:
  validate:
    docker:
      - image: hashicorp/terraform:${terraformVersion}
    steps:
      - checkout
      - run:
          name: Initialize Terraform
          command: cd terraform && terraform init -backend=false
      - run:
          name: Validate Terraform
          command: cd terraform && terraform validate
      - run:
          name: Check Format
          command: cd terraform && terraform fmt -check -recursive

  plan:
    docker:
      - image: hashicorp/terraform:${terraformVersion}
    steps:
      - checkout
      - aws-cli/install
      - run:
          name: Configure AWS
          command: |
            aws configure set aws_access_key_id \${AWS_ACCESS_KEY_ID}
            aws configure set aws_secret_access_key \${AWS_SECRET_ACCESS_KEY}
            aws configure set default.region \${AWS_REGION}
      - run:
          name: Initialize Terraform
          command: cd terraform && terraform init
      - run:
          name: Terraform Plan
          command: cd terraform && terraform plan -out=tfplan -var="environment=${env}" -var="region=${region}"
      - persist_to_workspace:
          root: terraform
          paths:
            - tfplan

  ${options.includeCostEstimation ? `
  cost-estimation:
    docker:
      - image: infracost/infracost:latest
    steps:
      - attach_workspace:
          at: terraform
      - run:
          name: Infracost Breakdown
          command: |
            infracost breakdown --path terraform/tfplan --format json --out-file infracost.json
            infracost comment circleci --path infracost.json --token \${CIRCLECI_TOKEN}
      - store_artifacts:
          path: infracost.json
` : ""}
  ${options.includePolicyCheck ? `
  policy-check:
    docker:
      - image: openpolicyagent/opa:latest
    steps:
      - attach_workspace:
          at: terraform
      - run:
          name: OPA Policy Check
          command: |
            cd terraform
            terraform show -json tfplan > plan.json
            opa eval --data /policies --input plan.json "data.terraform.deny"
` : ""}
  ${options.includeSecurityScan ? `
  security-scan:
    docker:
      - image: aquasec/tfsec:latest
    steps:
      - attach_workspace:
          at: terraform
      - run:
          name: tfsec
          command: cd terraform && tfsec .
      - run:
          name: Checkov
          command: |
            pip install checkov
            checkov -d terraform --framework terraform
` : ""}
  apply:
    docker:
      - image: hashicorp/terraform:${terraformVersion}
    steps:
      - attach_workspace:
          at: terraform
      - aws-cli/install
      - run:
          name: Configure AWS
          command: |
            aws configure set aws_access_key_id \${AWS_ACCESS_KEY_ID}
            aws configure set aws_secret_access_key \${AWS_SECRET_ACCESS_KEY}
            aws configure set default.region \${AWS_REGION}
      - run:
          name: Initialize Terraform
          command: cd terraform && terraform init
      - run:
          name: Terraform Apply
          command: cd terraform && terraform apply -auto-approve tfplan

workflows:
  terraform-${env}:
    jobs:
      - validate
      - plan:
          requires:
            - validate
          filters:
            branches:
              only:
                - main
                - develop
      ${options.includeCostEstimation ? "- cost-estimation:\n          requires:\n            - plan" : ""}
      ${options.includePolicyCheck ? "- policy-check:\n          requires:\n            - plan" : ""}
      ${options.includeSecurityScan ? "- security-scan:\n          requires:\n            - plan" : ""}
      - apply:
          requires:
            - plan
          ${options.includeCostEstimation ? "            - cost-estimation" : ""}
          ${options.includePolicyCheck ? "            - policy-check" : ""}
          ${options.includeSecurityScan ? "            - security-scan" : ""}
          filters:
            branches:
              only:
                - main
                - develop
          ${options.manualApproval ? "          type: approval" : ""}
`;

  return {
    files,
    mainFile: ".circleci/config.yml",
    format: "circleci",
    explanation: `Generated CircleCI configuration for ${env} environment`
  };
}

function generateJenkins(options: PipelineOptions): PipelineResult {
  const files: Record<string, string> = {};
  const env = options.environment;
  const provider = options.provider;
  const region = options.region;
  const terraformVersion = options.terraformVersion || "1.7.0";

  files["Jenkinsfile"] = `pipeline {
    agent any

    environment {
      TF_VERSION = "${terraformVersion}"
      TF_VAR_environment = "${env}"
      TF_VAR_region = "${region}"
      AWS_REGION = "${region}"
      AWS_ACCESS_KEY_ID = credentials('aws-access-key-id')
      AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
    }

    tools {
      terraform "\${TF_VERSION}"
    }

    stages {
      stage('Validate') {
        steps {
          dir('terraform') {
            sh '''
              terraform init -backend=false
              terraform validate
              terraform fmt -check -recursive
            '''
          }
        }
      }

      stage('Plan') {
        steps {
          dir('terraform') {
            sh '''
              terraform init
              terraform plan -out=tfplan -var="environment=\${TF_VAR_environment}" -var="region=\${TF_VAR_region}"
            '''
          }
          archiveArtifacts artifacts: 'terraform/tfplan', fingerprint: true
        }
      }

      ${options.includeCostEstimation ? `
      stage('Cost Estimation') {
        steps {
          dir('terraform') {
            sh '''
              infracost breakdown --path tfplan --format json --out-file infracost.json
              infracost comment jenkins --path infracost.json
            '''
          }
        }
      }
      ` : ""}
      ${options.includePolicyCheck ? `
      stage('Policy Check') {
        steps {
          dir('terraform') {
            sh '''
              terraform show -json tfplan > plan.json
              opa eval --data policies --input plan.json "data.terraform.deny"
            '''
          }
        }
      }
      ` : ""}
      ${options.includeSecurityScan ? `
      stage('Security Scan') {
        steps {
          dir('terraform') {
            sh '''
              tfsec .
              checkov -d . --framework terraform
            '''
          }
        }
      }
      ` : ""}
      stage('Apply') {
        when {
          anyOf {
            branch 'main'
            branch 'develop'
          }
        }
        ${options.manualApproval ? `
        steps {
          input message: 'Approve Terraform apply for ${env}?', ok: 'Approve'
        }
        ` : ""}
        steps {
          dir('terraform') {
            sh '''
              terraform init
              terraform apply -auto-approve tfplan
            '''
          }
        }
      }
    }

    post {
      always {
        cleanWs()
      }
      failure {
        emailext (
          subject: "Pipeline Failed: \${JOB_NAME} - \${BUILD_NUMBER}",
          body: "Build \${BUILD_URL} failed.",
          to: "\${DEFAULT_RECIPIENTS}"
        )
      }
    }
  }
`;

  return {
    files,
    mainFile: "Jenkinsfile",
    format: "jenkins",
    explanation: `Generated Jenkinsfile for ${env} environment`
  };
}

export function generatePipeline(options: PipelineOptions): PipelineResult {
  switch (options.format) {
    case "github-actions":
      return generateGitHubActions(options);
    case "gitlab-ci":
      return generateGitLabCI(options);
    case "azure-devops":
      return generateAzureDevOps(options);
    case "circleci":
      return generateCircleCI(options);
    case "jenkins":
      return generateJenkins(options);
    default:
      throw new Error(`Unsupported pipeline format: ${options.format}`);
  }
}