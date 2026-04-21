# AWS Billing Report - February 2026

## Overview
- **Month:** February 2026
- **Total Cost:** $85.34
- **Forecasted Cost for Current Month (March 2026):** $89.94

## Cost Breakdown by Service
1. **Elastic Compute Cloud (EC2):** $26.25
2. **Relational Database Service (RDS):** $20.41
3. **Elastic Load Balancing (ELB):** $17.45
   - Application LoadBalancer-hour: $16.93
   - Application load balancer capacity unit-hour: $0.52
4. **Virtual Private Cloud (VPC):** $14.13
   - In-use public IPv4 address: $10.78 (2,156.608 Hrs)
   - Idle public IPv4 address: $3.35 (669.639 Hrs)
5. **Lightsail:** $3.36
6. **Data Transfer:** $2.92
7. **Secrets Manager:** $0.40
8. **CloudWatch:** $0.21
9. **Route 53:** $0.10
10. **Amplify:** $0.10

## Analysis & Recommendations
- The top 4 services (EC2, RDS, ELB, VPC) account for ~$78.24, which is over 90% of the total cost.
- **VPC Costs:** There is a charge of $3.35 for **Idle public IPv4 addresses**. We should review our Elastic IPs and release any that are not attached to a running instance to save costs.
- **ELB Costs:** $17.45 is spent on Application Load Balancers. We should verify if the current traffic volume justifies this or if we can optimize the architecture (e.g., using a cheaper ALB setup if it's strictly a dev/test environment).
- **RDS & EC2:** Represent the bulk of compute/database costs ($46.66). Consider reviewing instance sizes and checking if we can utilize Reserved Instances or Savings Plans if these are long-term workloads.
