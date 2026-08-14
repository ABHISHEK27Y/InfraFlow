<div align="center">
  <h1>🚀 InfraFlow 🚀</h1>
  <p><b>Design Your Cloud Infrastructure Visually. Generate Production-Ready Terraform Instantly.</b></p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React_Flow-12-FF0072?style=for-the-badge&logo=react" alt="React Flow" />
    <img src="https://img.shields.io/badge/Terraform-844FBA?style=for-the-badge&logo=terraform" alt="Terraform" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </p>
</div>

<br/>

InfraFlow is a state-of-the-art interactive web application that bridges the gap between cloud architecture design and Infrastructure-as-Code (IaC). Sketch out your AWS architectures on a beautiful canvas and watch as the underlying Terraform configurations write themselves. 

---

## ✨ Why InfraFlow?

Gone are the days of manually typing out tedious IDs and Terraform associations. With our custom-built **Universal Graph Communication Protocol (UGCP)**, drawing a line on the canvas isn't just a visual aid—it literally wires the backend code for you. 

### 🌟 Key Features

*   **🖱️ Drag-and-Drop Visualizer**: Effortlessly drag AWS components (VPCs, Subnets, EC2s, Security Groups, ALBs, S3, RDS) from the sidebar and drop them directly onto the interactive canvas.
*   **⚡ Auto-Wiring (UGCP Integration)**: Connect a Security Group to an EC2 instance, or drag a Subnet inside a VPC, and the corresponding Terraform `vpc_id`, `subnet_id`, and `vpc_security_group_ids` are immediately and accurately populated. Zero typing required.
*   **💻 Live Terraform Compilation**: View the generated Terraform configuration in real-time in the Monaco-powered side editor. Every change in the canvas is synced with 0ms latency to the editor.
*   **📸 Export to Canvas Image**: Done designing? Click the snapshot camera to instantly capture a pristine `.png` rendering of your entire architectural layout.
*   **📦 One-Click Deployment Bundle**: Hit the Download button to instantly generate and download a complete `.zip` bundle of your Terraform codebase, ready for `terraform init` and `terraform apply`.

---

## 🚀 Getting Started

Follow these instructions to get your development environment up and running.

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   [npm](https://www.npmjs.com/) (Node Package Manager)

### Installation

1. **Clone the repository & Install Dependencies:**
   ```bash
   git clone https://github.com/ABHISHEK27Y/InfraFlow.git
   cd cloudSketch
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the necessary variables for Clerk and MongoDB:
   ```env
   # Backend API
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

   # Clerk Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key_here
   CLERK_SECRET_KEY=your_secret_here

   # Database connection
   MONGODB_URI=your_mongo_string
   MONGODB_PASSWD=your_mongo_password
   ```

3. **Start the Engine:**
   ```bash
   npm run dev
   ```

4. **Start Architecting!** 🏗️
   Open your browser to [http://localhost:3000](http://localhost:3000) and start building!

---

## 🛠️ Architecture & Stack

InfraFlow uses a powerful decoupled logic engine:

*   **Frontend**: Next.js App Router, TailwindCSS, Framer Motion, and Zustand for state management.
*   **Canvas Engine**: `@xyflow/react` powers the interactive nodes, edges, and sub-flow mechanisms.
*   **Compiler Engine**: Custom written Go-like Template Evaluator using `.tf.tmpl` definitions mapped via `nodeRegistry.ts`.
*   **Auto-Wiring Layer**: The `UGCP` (Universal Graph Communication Protocol) actively monitors canvas events (`onConnect`, `onContainerEnter`) to intelligently sync component relationships to the backend templates.

<div align="center">
  <i>Built with ❤️ for Cloud Architects & DevOps Engineers</i>
</div>