import { evaluateTemplate } from "./templateEvaluator";

describe("templateEvaluator", () => {
  describe("basic variable substitution", () => {
    it("should substitute simple dot notation variables", () => {
      const template = "Hello {{.Name}}!";
      const data = { Name: "World" };
      expect(evaluateTemplate(template, data)).toBe("Hello World!");
    });

    it("should substitute nested dot notation variables", () => {
      const template = "User: {{.User.Name}}";
      const data = { User: { Name: "Alice" } };
      expect(evaluateTemplate(template, data)).toBe("User: Alice");
    });

    it("should handle undefined variables gracefully", () => {
      const template = "Hello {{.Missing}}!";
      const data = { Name: "World" };
      expect(evaluateTemplate(template, data)).toBe("Hello !");
    });

    it("should handle null variables gracefully", () => {
      const template = "Value: {{.Value}}";
      const data = { Value: null };
      expect(evaluateTemplate(template, data)).toBe("Value: ");
    });
  });

  describe("scope variables ($)", () => {
    it("should resolve $var from scope", () => {
      const template = "Value: {{$var}}";
      const data = {};
      const scope = { var: "fromScope" };
      expect(evaluateTemplate(template, data, scope)).toBe("Value: fromScope");
    });

    it("should resolve $var.Path from scope", () => {
      const template = "Value: {{$obj.field}}";
      const data = {};
      const scope = { obj: { field: "nested" } };
      expect(evaluateTemplate(template, data, scope)).toBe("Value: nested");
    });

    it("should prioritize scope over data for $", () => {
      const template = "Value: {{$key}}";
      const data = { key: "fromData" };
      const scope = { key: "fromScope" };
      expect(evaluateTemplate(template, data, scope)).toBe("Value: fromScope");
    });
  });

  describe("root reference ($.)", () => {
    it("should resolve $.Key from root data", () => {
      const template = "Root: {{$.RootKey}}, Scope: {{$scopeKey}}";
      const data = { RootKey: "rootValue" };
      const scope = { scopeKey: "scopeValue" };
      expect(evaluateTemplate(template, data, scope)).toBe("Root: rootValue, Scope: scopeValue");
    });
  });

  describe("or operator (default values)", () => {
    it("should use default when value is undefined", () => {
      const template = 'Name: {{or .Name "Default"}}';
      const data = {};
      expect(evaluateTemplate(template, data)).toBe('Name: Default');
    });

    it("should use default when value is empty string", () => {
      const template = 'Name: {{or .Name "Default"}}';
      const data = { Name: "" };
      expect(evaluateTemplate(template, data)).toBe('Name: Default');
    });

    it("should use default when value is null", () => {
      const template = 'Name: {{or .Name "Default"}}';
      const data = { Name: null };
      expect(evaluateTemplate(template, data)).toBe('Name: Default');
    });

    it("should use actual value when present", () => {
      const template = 'Name: {{or .Name "Default"}}';
      const data = { Name: "Actual" };
      expect(evaluateTemplate(template, data)).toBe('Name: Actual');
    });

    it("should work with scope variables", () => {
      const template = 'Name: {{or $name "Default"}}';
      const data = {};
      const scope = { name: "Scoped" };
      expect(evaluateTemplate(template, data, scope)).toBe('Name: Scoped');
    });
  });

  describe("if conditions", () => {
    it("should render if block when condition is truthy", () => {
      const template = "{{if .Show}}Visible{{end}}";
      const data = { Show: true };
      expect(evaluateTemplate(template, data)).toBe("Visible");
    });

    it("should not render if block when condition is falsy", () => {
      const template = "{{if .Show}}Visible{{end}}";
      const data = { Show: false };
      expect(evaluateTemplate(template, data)).toBe("");
    });

    it("should render else block when condition is falsy", () => {
      const template = "{{if .Show}}Yes{{else}}No{{end}}";
      const data = { Show: false };
      expect(evaluateTemplate(template, data)).toBe("No");
    });

    it("should support eq condition", () => {
      const template = '{{if eq .Status "active"}}Active{{else}}Inactive{{end}}';
      expect(evaluateTemplate(template, { Status: "active" })).toBe("Active");
      expect(evaluateTemplate(template, { Status: "inactive" })).toBe("Inactive");
    });

    it("should support nested if blocks", () => {
      const template = "{{if .Outer}}{{if .Inner}}Both{{else}}Outer only{{end}}{{else}}None{{end}}";
      expect(evaluateTemplate(template, { Outer: true, Inner: true })).toBe("Both");
      expect(evaluateTemplate(template, { Outer: true, Inner: false })).toBe("Outer only");
      expect(evaluateTemplate(template, { Outer: false })).toBe("None");
    });

    it("should work with scope variables in conditions", () => {
      const template = "{{if $flag}}Enabled{{end}}";
      const data = {};
      const scope = { flag: true };
      expect(evaluateTemplate(template, data, scope)).toBe("Enabled");
    });
  });

  describe("range loops", () => {
    it("should iterate over array with item variable", () => {
      const template = "{{range .Items}}- {{.}}{{end}}";
      const data = { Items: ["a", "b", "c"] };
      expect(evaluateTemplate(template, data)).toBe("- a- b- c");
    });

    it("should iterate with index and item variables", () => {
      const template = "{{range $i, $item := .Items}}{{$i}}: {{$item}};{{end}}";
      const data = { Items: ["x", "y"] };
      expect(evaluateTemplate(template, data)).toBe("0: x;1: y;");
    });

    it("should handle empty arrays", () => {
      const template = "{{range .Items}}- {{.}}{{end}}";
      const data = { Items: [] };
      expect(evaluateTemplate(template, data)).toBe("");
    });

    it("should create new scope for each iteration", () => {
      const template = "{{range $i, $item := .Items}}{{$item}}.{{$i}}{{end}}";
      const data = { Items: ["a", "b"] };
      expect(evaluateTemplate(template, data)).toBe("a.0b.1");
    });

    it("should access parent scope variables inside range", () => {
      const template = "{{range .Items}}{{$.Prefix}}-{{.}}{{end}}";
      const data = { Prefix: "X", Items: ["1", "2"] };
      expect(evaluateTemplate(template, data)).toBe("X-1X-2");
    });
  });

  describe("whitespace control", () => {
    it("should trim whitespace with {{- -}}", () => {
      const template = "{{- .Name -}}";
      const data = { Name: "Test" };
      expect(evaluateTemplate(template, data)).toBe("Test");
    });

    it("should handle whitespace in if blocks", () => {
      const template = "{{- if .Show -}}Yes{{- else -}}No{{- end -}}";
      expect(evaluateTemplate(template, { Show: true })).toBe("Yes");
      expect(evaluateTemplate(template, { Show: false })).toBe("No");
    });

    it("should handle whitespace in range blocks", () => {
      const template = "{{- range .Items -}}{{.}}{{- end -}}";
      const data = { Items: ["a", "b"] };
      expect(evaluateTemplate(template, data)).toBe("ab");
    });
  });

  describe("complex real-world templates", () => {
    it("should evaluate VPC template correctly", () => {
      const template = `resource "aws_vpc" "{{.NodeID}}" {
  cidr_block = "{{.CIDR}}"
  tags = {
    Name = "{{or .Name "TODO"}}"
  }
}`;
      const data = {
        NodeID: "vpc-123",
        CIDR: "10.0.0.0/16",
        Name: "my-vpc",
      };
      const result = evaluateTemplate(template, data);
      expect(result).toContain('resource "aws_vpc" "vpc-123"');
      expect(result).toContain('cidr_block = "10.0.0.0/16"');
      expect(result).toContain('Name = "my-vpc"');
    });

    it("should evaluate EC2 template with conditionals", () => {
      const template = `resource "aws_instance" "{{.NodeID}}" {
  ami = "{{or .AMI "TODO"}}"
  {{- if .SubnetID }}
  subnet_id = "{{.SubnetID}}"
  {{- end }}
}`;
      const dataWithSubnet = { NodeID: "i-123", AMI: "ami-abc", SubnetID: "subnet-123" };
      const dataWithoutSubnet = { NodeID: "i-123", AMI: "ami-abc" };

      const resultWith = evaluateTemplate(template, dataWithSubnet);
      expect(resultWith).toContain('subnet_id = "subnet-123"');

      const resultWithout = evaluateTemplate(template, dataWithoutSubnet);
      expect(resultWithout).not.toContain("subnet_id");
    });

    it("should evaluate Security Group template with ranges", () => {
      const template = `resource "aws_security_group" "{{.Name}}" {
{{range $i, $rule := .IngressRules}}
  ingress {{$i}} = "{{$rule.FromPort}}"
{{end}}
}`;
      const data = {
        Name: "sg-1",
        IngressRules: [
          { FromPort: 80, ToPort: 80 },
          { FromPort: 443, ToPort: 443 },
        ],
      };
      const result = evaluateTemplate(template, data);
      expect(result).toContain("ingress 0 = \"80\"");
      expect(result).toContain("ingress 1 = \"443\"");
    });
  });

  describe("edge cases", () => {
    it("should handle empty template", () => {
      expect(evaluateTemplate("", {})).toBe("");
    });

    it("should handle template with no tags", () => {
      expect(evaluateTemplate("Plain text", {})).toBe("Plain text");
    });

    it("should handle malformed tags gracefully", () => {
      const template = "{{ .Name";
      const result = evaluateTemplate(template, { Name: "Test" });
      expect(result).toContain("{{ .Name");
    });

    it("should handle unclosed if block", () => {
      const template = "{{if .Show}}Visible";
      const result = evaluateTemplate(template, { Show: true });
      expect(result).toBe("Visible");
    });

    it("should handle special characters in values", () => {
      const template = "Value: {{.Value}}";
      const data = { Value: "Hello\nWorld\tTab" };
      expect(evaluateTemplate(template, data)).toBe("Value: Hello\nWorld\tTab");
    });

    it("should handle numeric values", () => {
      const template = "Port: {{.Port}}, Count: {{.Count}}";
      const data = { Port: 8080, Count: 3 };
      expect(evaluateTemplate(template, data)).toBe("Port: 8080, Count: 3");
    });

    it("should handle boolean values", () => {
      const template = "Enabled: {{.Enabled}}";
      expect(evaluateTemplate(template, { Enabled: true })).toBe("Enabled: true");
      expect(evaluateTemplate(template, { Enabled: false })).toBe("Enabled: false");
    });
  });

  describe("Terraform-specific patterns", () => {
    it("should handle HCL-style interpolation in templates", () => {
      const template = `vpc_id = aws_vpc.{{.VpcName}}.id`;
      const data = { VpcName: "main" };
      expect(evaluateTemplate(template, data)).toBe("vpc_id = aws_vpc.main.id");
    });

    it("should handle quoted values correctly", () => {
      const template = 'cidr_block = "{{.CIDR}}"';
      const data = { CIDR: "10.0.0.0/16" };
      expect(evaluateTemplate(template, data)).toBe('cidr_block = "10.0.0.0/16"');
    });

    it("should handle list rendering for security groups", () => {
      const template = `vpc_security_group_ids = [
{{- range $i, $sg := .SecurityGroups }}
  {{- if $i}},{{end}}"{{$sg}}"
{{- end }}
]`;
      const data = { SecurityGroups: ["sg-1", "sg-2"] };
      const result = evaluateTemplate(template, data);
      expect(result).toContain('"sg-1"');
      expect(result).toContain('"sg-2"');
      expect(result).toContain(",");
    });
  });
});