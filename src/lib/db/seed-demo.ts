import { users, resumes, resumeSections } from './schema';

/**
 * Seed a demo-fingerprint user with a sample resume.
 * Called automatically when the database is empty.
 */
export async function seedDemoUser(db: any) {
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    name: 'amadeus',
    authType: 'fingerprint',
    fingerprint: 'demo-fingerprint',
  });

  const resumeId = crypto.randomUUID();
  await db.insert(resumes).values({
    id: resumeId,
    userId,
    title: '示例简历 - amadeus',
    template: 'modern',
    language: 'zh',
  });

  const sections = [
    {
      type: 'personal_info',
      title: '个人信息',
      sortOrder: 0,
      content: {
        fullName: 'amadeus',
        jobTitle: '示例岗位 · 高级前端工程师',
        email: 'amadeus@example.com',
        phone: '138-0000-0000',
        location: '示例城市',
        website: 'https://example.com',
      },
    },
    {
      type: 'summary',
      title: '个人简介',
      sortOrder: 1,
      content: {
        text: '这是一个示例个人简介，用于展示简历模板效果。拥有 X 年 Y 领域经验，专注于 Z 技术栈。曾主导多个大型产品的架构设计与性能优化。擅长将复杂业务需求转化为优雅的技术方案，对代码质量和用户体验有极高追求。',
      },
    },
    {
      type: 'work_experience',
      title: '工作经历',
      sortOrder: 2,
      content: {
        items: [
          {
            id: crypto.randomUUID(),
            company: '某某科技有限公司',
            position: '高级前端工程师',
            location: '示例城市',
            startDate: '2022-03',
            endDate: null,
            current: true,
            description: '负责核心产品模块的前端架构设计与功能开发。',
            highlights: [
              '主导设计并实现了某某系统的某某模块，提升某某指标 X%',
              '搭建前端性能监控体系，核心指标优化至行业领先水平',
              '设计组件库架构方案，跨团队复用率大幅提升',
            ],
          },
          {
            id: crypto.randomUUID(),
            company: '某互联网大厂',
            position: '前端工程师',
            location: '示例城市',
            startDate: '2019-07',
            endDate: '2022-02',
            current: false,
            description: '参与平台级产品的开发与维护，负责开发者工具链建设。',
            highlights: [
              '从零搭建某某插件系统，支持 N+ 第三方插件接入',
              '优化某某编译流程，构建速度提升 X 倍',
              '主导单元测试覆盖率从 X% 提升至 Y%，大幅减少线上故障',
            ],
          },
          {
            id: crypto.randomUUID(),
            company: '某创业公司',
            position: '前端开发实习生',
            location: '示例城市',
            startDate: '2018-06',
            endDate: '2019-06',
            current: false,
            description: '参与 B 端系统的前端开发。',
            highlights: [
              '独立完成某某管理模块的重构，使用新技术栈替换旧实现',
              '封装通用组件，被团队广泛采用',
            ],
          },
        ],
      },
    },
    {
      type: 'education',
      title: '教育背景',
      sortOrder: 3,
      content: {
        items: [
          {
            id: crypto.randomUUID(),
            institution: '示例理工大学',
            degree: '硕士',
            field: '软件工程',
            location: '示例城市',
            startDate: '2016-09',
            endDate: '2019-06',
            gpa: '3.8/4.0',
            highlights: ['研究方向：某某领域', '校级优秀毕业论文'],
          },
          {
            id: crypto.randomUUID(),
            institution: '示例综合大学',
            degree: '学士',
            field: '计算机科学与技术',
            location: '示例城市',
            startDate: '2012-09',
            endDate: '2016-06',
            gpa: '3.6/4.0',
            highlights: [],
          },
        ],
      },
    },
    {
      type: 'skills',
      title: '技能特长',
      sortOrder: 4,
      content: {
        categories: [
          { id: crypto.randomUUID(), name: '前端框架', skills: ['React', 'Next.js', 'Vue 3', 'TypeScript'] },
          { id: crypto.randomUUID(), name: '工程化', skills: ['Webpack', 'Vite', 'Turborepo', 'CI/CD'] },
          { id: crypto.randomUUID(), name: '其他', skills: ['Node.js', 'Docker', 'PostgreSQL', 'Figma'] },
        ],
      },
    },
    {
      type: 'projects',
      title: '项目经历',
      sortOrder: 5,
      content: {
        items: [
          {
            id: crypto.randomUUID(),
            name: '示例开源项目 · AI 简历生成器',
            url: 'https://github.com/example/demo-project',
            startDate: '2024-10',
            endDate: '2025-02',
            description: '这是一个示例项目描述，展示简历模板中项目经历的排版效果。',
            technologies: ['Next.js', 'React 19', 'Tailwind CSS', 'AI SDK'],
            highlights: [
              '使用 AI SDK 实现某某功能',
              '设计 N 套模板，支持实时预览与多格式导出',
            ],
          },
        ],
      },
    },
  ];

  for (const section of sections) {
    await db.insert(resumeSections).values({
      id: crypto.randomUUID(),
      resumeId,
      ...section,
    } as any);
  }

  console.log('[DB] Auto-seed complete: demo user created');
}
