import { parseTerraformFile, parseHCL, terraformToDiagram } from "./terraformParser";

describe("terraformParser", () => {
  describe("parseHCL", () => {
    it("should parse a simple VPC resource", () => {
      const hcl = `
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
}
`;
      const result = parseHCL(hcl);
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].type).toBe("aws_vpc");
      expect(result.resources[0].name).toBe("main");
      expect(result.resources[0].attributes.cidr_block).toBe("10.0.0.0/16");
      expect(result.resources[0].attributes.enable_dns_hostnames).toBe(true);
    });

    it("should parse multiple resources", () => {
      const hcl = `
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_instance" "web" {
  ami = "ami-12345"
  instance_type = "t2.micro"
  subnet_id = aws_subnet.public.id
}
`;
      const result = parseHCL(hcl);
      expect(result.resources).toHaveLength(3);
      expect(result.resources[0].type).toBe("aws_vpc");
      expect(result.resources[1].type).toBe("aws_subnet");
      expect(result.resources[2].type).toBe("aws_instance");
    });

    it("should parse references correctly", () => {
      const hcl = `
resource "aws_instance" "web" {
  subnet_id = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
}
`;
      const result = parseHCL(hcl);
      const attrs = result.resources[0].attributes;
      expect(attrs.subnet_id).toEqual({ ref: "aws_subnet.public.id" });
      expect(attrs.vpc_security_group_ids).toHaveLength(1);
      expect(attrs.vpc_security_group_ids[0]).toEqual({ ref: "aws_security_group.web.id" });
    });

    it("should parse lists", () => {
      const hcl = `
resource "aws_security_group" "web" {
  ingress = ["http", "https"]
}
`;
      const result = parseHCL(hcl);
      expect(result.resources[0].attributes.ingress).toEqual(["http", "https"]);
    });

    it("should parse boolean and numeric values", () => {
      const hcl = `
resource "aws_instance" "web" {
  instance_type = "t2.micro"
  count = 3
  monitoring = true
  disable_api_termination = false
}
`;
      const result = parseHCL(hcl);
      const attrs = result.resources[0].attributes;
      expect(attrs.count).toBe(3);
      expect(attrs.monitoring).toBe(true);
      expect(attrs.disable_api_termination).toBe(false);
    });

    it("should parse variable blocks", () => {
      const hcl = `
variable "region" {
  default = "us-east-1"
  type = string
}

variable "instance_type" {
  default = "t2.micro"
}
`;
      const result = parseHCL(hcl);
      expect(result.variables.region.default).toBe("us-east-1");
      expect(result.variables.instance_type.default).toBe("t2.micro");
    });

    it("should parse output blocks", () => {
      const hcl = `
output "vpc_id" {
  value = aws_vpc.main.id
}
`;
      const result = parseHCL(hcl);
      expect(result.outputs.vpc_id.value).toEqual({ ref: "aws_vpc.main.id" });
    });
  });

  describe("terraformToDiagram", () => {
    it("should convert VPC to diagram node", () => {
      const parsed = {
        resources: [
          {
            type: "aws_vpc",
            name: "main",
            attributes: {
              cidr_block: "10.0.0.0/16",
              enable_dns_hostnames: true,
            },
          },
        ],
        variables: {},
        outputs: {},
      };

      const { nodes } = terraformToDiagram(parsed);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe("vpc");
      expect(nodes[0].data.CIDR).toBe("10.0.0.0/16");
      expect(nodes[0].data.EnableDNS).toBe("yes");
      // Name will be undefined since we didn't provide it
    });

    it("should convert EC2 with subnet reference", () => {
      const parsed = {
        resources: [
          {
            type: "aws_vpc",
            name: "main",
            attributes: { cidr_block: "10.0.0.0/16" },
          },
          {
            type: "aws_subnet",
            name: "public",
            attributes: {
              vpc_id: { ref: "aws_vpc.main.id" },
              cidr_block: "10.0.1.0/24",
            },
          },
          {
            type: "aws_instance",
            name: "web",
            attributes: {
              ami: "ami-12345",
              instance_type: "t2.micro",
              subnet_id: { ref: "aws_subnet.public.id" },
            },
          },
        ],
        variables: {},
        outputs: {},
      };

      const { nodes } = terraformToDiagram(parsed);
      expect(nodes).toHaveLength(3);

      const ec2Node = nodes.find((n) => n.type === "ec2");
      expect(ec2Node.data.SubnetID).toBeDefined();
      expect(ec2Node.data.AMI).toBe("ami-12345");
      expect(ec2Node.data.InstanceType).toBe("t2.micro");

      const subnetNode = nodes.find((n) => n.type === "subnet");
      expect(subnetNode.data.ParentVpcId).toBeDefined();
    });

    it("should convert Security Group", () => {
      const parsed = {
        resources: [
          {
            type: "aws_security_group",
            name: "web",
            attributes: {
              name: "web-sg",
              description: "Web server SG",
              vpc_id: { ref: "aws_vpc.main.id" },
            },
          },
        ],
        variables: {},
        outputs: {},
      };

      const { nodes } = terraformToDiagram(parsed);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe("securitygroup");
      expect(nodes[0].data.Name).toBe("web-sg");
      expect(nodes[0].data.Description).toBe("Web server SG");
    });

    it("should convert RDS", () => {
      const parsed = {
        resources: [
          {
            type: "aws_db_instance",
            name: "database",
            attributes: {
              engine: "postgres",
              engine_version: "14.5",
              instance_class: "db.t3.micro",
              allocated_storage: 20,
              storage_type: "gp2",
              db_name: "myapp",
              username: "admin",
              password: "secret123",
              tags_Name: "my-db",
            },
          },
        ],
        variables: {},
        outputs: {},
      };

      const { nodes } = terraformToDiagram(parsed);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe("rds");
      expect(nodes[0].data.Engine).toBe("postgres");
      expect(nodes[0].data.InstanceClass).toBe("db.t3.micro");
      expect(nodes[0].data.AllocatedStorage).toBe(20);
      expect(nodes[0].data.DBName).toBe("myapp");
    });

    it("should convert EBS and attachment", () => {
      const parsed = {
        resources: [
          {
            type: "aws_ebs_volume",
            name: "data",
            attributes: {
              size: 100,
              type: "gp3",
              availability_zone: "us-east-1a",
              encrypted: true,
              tags_Name: "data-volume",
            },
          },
          {
            type: "aws_instance",
            name: "web",
            attributes: {
              ami: "ami-12345",
              instance_type: "t2.micro",
            },
          },
          {
            type: "aws_volume_attachment",
            name: "attach",
            attributes: {
              volume_id: { ref: "aws_ebs_volume.data.id" },
              instance_id: { ref: "aws_instance.web.id" },
              device_name: "/dev/sdf",
            },
          },
        ],
        variables: {},
        outputs: {},
      };

      const { nodes } = terraformToDiagram(parsed);
      expect(nodes).toHaveLength(3);

      const ebsNode = nodes.find((n) => n.type === "ebs");
      expect(ebsNode.data.Size).toBe(100);
      expect(ebsNode.data.VolumeType).toBe("gp3");
      expect(ebsNode.data.Encrypted).toBe("yes");

      const attachNode = nodes.find((n) => n.type === "ec2ebs");
      expect(attachNode).toBeDefined();
      expect(attachNode.data.DeviceName).toBe("/dev/sdf");
    });

    it("should convert ALB and target attachment", () => {
      const parsed = {
        resources: [
          {
            type: "aws_lb",
            name: "main",
            attributes: {
              name: "main-alb",
              internal: false,
              subnets: [{ ref: "aws_subnet.public.id" }],
              listeners: [{ port: 80 }],
              target_group: [{ port: 80 }],
            },
          },
          {
            type: "aws_instance",
            name: "web",
            attributes: {
              ami: "ami-12345",
              instance_type: "t2.micro",
            },
          },
          {
            type: "aws_lb_target_group_attachment",
            name: "web",
            attributes: {
              target_group_arn: { ref: "aws_lb_target_group.main.arn" },
              target_id: { ref: "aws_instance.web.id" },
              port: 80,
            },
          },
        ],
        variables: {},
        outputs: {},
      };

      const { nodes } = terraformToDiagram(parsed);
      expect(nodes).toHaveLength(3);

      const elbNode = nodes.find((n) => n.type === "elb");
      expect(elbNode.data.Name).toBe("main-alb");
      expect(elbNode.data.Scheme).toBe("internet-facing");

      const attachNode = nodes.find((n) => n.type === "elbec2");
      expect(attachNode).toBeDefined();
      expect(attachNode.data.TargetPort).toBe(80);
    });
  });

  describe("parseTerraformFile", () => {
    it("should parse complete Terraform file and return nodes and edges", () => {
      const hcl = `
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_instance" "web" {
  ami = "ami-12345"
  instance_type = "t2.micro"
  subnet_id = aws_subnet.public.id
}
`;
      const { nodes } = parseTerraformFile(hcl);
      expect(nodes).toHaveLength(3);
    });
  });
});