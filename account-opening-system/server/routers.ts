      .input(z.object({
        applicationId: z.number(),
        isProfessionalInvestor: z.boolean(),
        approvedRiskProfile: z.enum(['Lowest', 'Low', 'Low to Medium', 'Medium', 'Medium to High', 'High']),
        comments: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 检查用户是否为审批人员或管理员
        if (ctx.user.role !== 'admin' && !ctx.user.email?.endsWith('@cmfinancial.com')) {
          throw new Error('没有权限进行审批操作');
        }
        
        // 获取审批人员信息
        const approver = await db.getApproverByUserId(ctx.user.id);
        if (!approver) {
          throw new Error('未找到审批人员信息，请联系管理员');
        }
        
        // 第一级审批必须有CE号码
        if (!approver.ceNumber) {
          throw new Error('第一级审批人员必须有CE号码');
        }
        
        // 检查是否已经进行过初审（防止重复审批）
        const existingApplication = await db.getCompleteApplicationData(input.applicationId);
        if (existingApplication?.application?.firstApprovalStatus === 'approved') {
          throw new Error('该申请已经完成初审，无法重复审批');
        }
        
        // 更新第一级审批信息（包含PI認定和風險評級）
        await db.updateFirstApproval(input.applicationId, {
          status: 'approved',
          approverEmail: ctx.user.email || '',
          approverName: approver.employeeName,
          approverCeNo: approver.ceNumber,
          comments: input.comments,
          isProfessionalInvestor: input.isProfessionalInvestor,
          riskProfile: input.approvedRiskProfile,
        });
        
        // 记录审批操作
        await db.createApprovalRecord({
          applicationId: input.applicationId,
          approverId: approver.id,
          action: 'first_approved' as any,
          comments: input.comments,
        });
        
        // 发送邮件通知合规部进行第二级审批
        try {
          const { sendFirstApprovalNotificationEmail } = await import('./email');
          const applicationData = await db.getCompleteApplicationData(input.applicationId);
          if (applicationData) {
            await sendFirstApprovalNotificationEmail(
              applicationData.application?.applicationNumber || '',
              applicationData.basicInfo?.chineseName || applicationData.basicInfo?.englishName || '未知',
              approver.employeeName,
              approver.ceNumber,
              input.isProfessionalInvestor,
              input.approvedRiskProfile
            );
          }
        } catch (emailError) {
          console.error('Failed to send first approval notification email:', emailError);
          // 邮件发送失败不影响审批流程
        }
        
        return { success: true };
      }),
    
    // 第二级审批（合规部终审）
    secondApprove: protectedProcedure
      .input(z.object({
        applicationId: z.number(),
        isProfessionalInvestor: z.boolean(),
        riskProfile: z.enum(['Lowest', 'Low', 'Low to Medium', 'Medium', 'Medium to High', 'High']),
        comments: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 检查用户是否为审批人员或管理员
        if (ctx.user.role !== 'admin' && !ctx.user.email?.endsWith('@cmfinancial.com')) {
          throw new Error('没有权限进行审批操作');
        }
        
        // 获取审批人员信息
        const approver = await db.getApproverByUserId(ctx.user.id);
        if (!approver) {
          throw new Error('未找到审批人员信息，请联系管理员');
        }
        
        // 检查第一级审批是否已通过
        const applicationData = await db.getCompleteApplicationData(input.applicationId);
        if (!applicationData?.application?.firstApprovalStatus || applicationData.application.firstApprovalStatus !== 'approved') {
          throw new Error('第一级审批尚未通过，无法进行第二级审批');
        }
        
        // 检查是否已经完成终审（防止重复审批）
        if (applicationData?.application?.secondApprovalStatus === 'approved') {
          throw new Error('该申请已经完成终审，无法重复审批');
        }
        
        // 检查初审和终审是否为同一人（通过userId比较）
        // firstApprovalBy存储的是初审人员的邮箱
        if (applicationData?.application?.firstApprovalBy) {
          const firstApprover = await db.getApproverByUserId(ctx.user.id);
          // 通过邮箱比较是否为同一人
          if (firstApprover && applicationData.application.firstApprovalBy === ctx.user.email) {
            throw new Error('初审和终审不能是同一人，请联系其他审批人员进行终审');
          }
        }
        
        // 更新第二级审批信息
        await db.updateSecondApproval(input.applicationId, {
          status: 'approved',