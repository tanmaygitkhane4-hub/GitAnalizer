import { prisma } from '../../config/database';
import type { Repository, RepositoryAnalysis, Commit } from '@prisma/client';

interface ScoringInput {
  repositories: (Repository & { 
    analysis: RepositoryAnalysis | null;
    commits: Commit[];
  })[];
  userId: string;
}

interface ScoreBreakdown {
  codeQuality: { score: number; weight: number; details: string[] };
  projectDepth: { score: number; weight: number; details: string[] };
  consistency: { score: number; weight: number; details: string[] };
  uiUx: { score: number; weight: number; details: string[] };
  security: { score: number; weight: number; details: string[] };
}

export class ScoringEngine {
  /**
   * Scoring Weights:
   * - Code Quality: 30%
   * - Project Depth: 25%
   * - Consistency: 15%
   * - UI/UX: 10%
   * - Security: 20%
   */
  private readonly WEIGHTS = {
    codeQuality: 0.30,
    projectDepth: 0.25,
    consistency: 0.15,
    uiUx: 0.10,
    security: 0.20,
  };

  async calculateScore(input: ScoringInput) {
    const { repositories, userId } = input;
    
    if (repositories.length === 0) {
      return this.saveScore(userId, {
        overall: 0,
        codeQuality: 0,
        projectDepth: 0,
        consistency: 0,
        uiUx: 0,
        security: 0,
        level: 'JUNIOR',
        percentile: 0,
      });
    }

    const breakdown = this.computeBreakdown(repositories);
    
    const overall = 
      breakdown.codeQuality.score * this.WEIGHTS.codeQuality +
      breakdown.projectDepth.score * this.WEIGHTS.projectDepth +
      breakdown.consistency.score * this.WEIGHTS.consistency +
      breakdown.uiUx.score * this.WEIGHTS.uiUx +
      breakdown.security.score * this.WEIGHTS.security;

    const level = this.determineLevel(overall);
    const percentile = this.estimatePercentile(overall);

    return this.saveScore(userId, {
      overall: Math.round(overall),
      codeQuality: Math.round(breakdown.codeQuality.score),
      projectDepth: Math.round(breakdown.projectDepth.score),
      consistency: Math.round(breakdown.consistency.score),
      uiUx: Math.round(breakdown.uiUx.score),
      security: Math.round(breakdown.security.score),
      level,
      percentile,
    });
  }

  private computeBreakdown(repos: ScoringInput['repositories']): ScoreBreakdown {
    return {
      codeQuality: this.scoreCodeQuality(repos),
      projectDepth: this.scoreProjectDepth(repos),
      consistency: this.scoreConsistency(repos),
      uiUx: this.scoreUiUx(repos),
      security: this.scoreSecurity(repos),
    };
  }

  private scoreCodeQuality(repos: ScoringInput['repositories']) {
    const analyzed = repos.filter(r => r.analysis);
    const details: string[] = [];
    
    if (analyzed.length === 0) {
      return { score: 50, weight: this.WEIGHTS.codeQuality, details: ['No analysis data'] };
    }

    const avgQuality = analyzed.reduce((sum, r) => sum + (r.analysis?.codeQuality || 0), 0) / analyzed.length;
    const avgTesting = analyzed.reduce((sum, r) => sum + (r.analysis?.testCoverage || 0), 0) / analyzed.length;
    const avgSecurity = analyzed.reduce((sum, r) => sum + (r.analysis?.security || 0), 0) / analyzed.length;

    const score = (avgQuality * 0.5 + avgTesting * 0.3 + avgSecurity * 0.2);
    
    if (avgTesting > 50) details.push(`${Math.round(avgTesting)}% avg test coverage`);
    if (avgQuality > 70) details.push('Clean code practices detected');
    
    return { score: Math.min(100, score), weight: this.WEIGHTS.codeQuality, details };
  }

  private scoreProjectDepth(repos: ScoringInput['repositories']) {
    const details: string[] = [];
    
    const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);
    const starScore = Math.min(30, Math.log10(totalStars + 1) * 15);

    const languages = new Set(repos.map(r => r.language).filter(Boolean));
    const langScore = Math.min(25, languages.size * 5);

    const ownProjects = repos.filter(r => !r.isFork && r.size > 100);
    const projectScore = Math.min(30, ownProjects.length * 3);

    const recentRepos = repos.filter(r => {
      if (!r.pushedAt) return false;
      const monthsAgo = (Date.now() - r.pushedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo < 6;
    });
    const recencyScore = Math.min(15, recentRepos.length * 3);

    const score = starScore + langScore + projectScore + recencyScore;
    
    if (languages.size > 3) details.push(`${languages.size} languages used`);
    if (ownProjects.length > 5) details.push(`${ownProjects.length} original projects`);
    
    return { score: Math.min(100, score), weight: this.WEIGHTS.projectDepth, details };
  }

  private scoreConsistency(repos: ScoringInput['repositories']) {
    const details: string[] = [];
    const allCommits = repos.flatMap(r => r.commits);
    
    if (allCommits.length === 0) {
      return { score: 20, weight: this.WEIGHTS.consistency, details: ['No commit history'] };
    }

    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const recentCommits = allCommits.filter(c => c.committedAt > sixMonthsAgo);
    const commitFrequency = Math.min(50, (recentCommits.length / 180) * 30 * 10);

    const avgMsgLen = allCommits.reduce((s, c) => s + c.message.length, 0) / allCommits.length;
    const msgQualityScore = Math.min(25, (avgMsgLen / 50) * 25);

    const activeRepos = repos.filter(r => r.commits.length > 10);
    const streakScore = Math.min(25, activeRepos.length * 5);

    const score = commitFrequency + msgQualityScore + streakScore;
    
    if (recentCommits.length > 30) details.push(`${recentCommits.length} commits in last 6 months`);
    
    return { score: Math.min(100, score), weight: this.WEIGHTS.consistency, details };
  }

  private scoreUiUx(repos: ScoringInput['repositories']) {
    const details: string[] = [];
    
    const withReadme = repos.filter(r => r.hasReadme).length;
    const readmeScore = Math.min(40, (withReadme / Math.max(repos.length, 1)) * 40);

    // topics is stored as JSON string
    const withTopics = repos.filter(r => {
      try {
        const t = r.topics ? JSON.parse(r.topics) : [];
        return Array.isArray(t) && t.length > 0;
      } catch { return false; }
    }).length;
    const topicScore = Math.min(20, (withTopics / Math.max(repos.length, 1)) * 20);

    const frontendLangs = ['TypeScript', 'JavaScript', 'CSS', 'HTML'];
    const hasFrontend = repos.some(r => frontendLangs.includes(r.language || ''));
    const frontendScore = hasFrontend ? 40 : 20;

    const score = readmeScore + topicScore + frontendScore;
    
    if (withReadme > repos.length * 0.7) details.push('Good README documentation');
    
    return { score: Math.min(100, score), weight: this.WEIGHTS.uiUx, details };
  }

  private scoreSecurity(repos: ScoringInput['repositories']) {
    const details: string[] = [];
    
    const analyzed = repos.filter(r => r.analysis);
    const avgSecurity = analyzed.length > 0
      ? analyzed.reduce((s, r) => s + (r.analysis?.security || 0), 0) / analyzed.length
      : 50;
    
    const securityScore = Math.min(40, avgSecurity * 0.4);

    const privateRatio = repos.filter(r => r.isPrivate).length / Math.max(repos.length, 1);
    const privateScore = Math.min(20, privateRatio * 40);

    const nonForkRatio = repos.filter(r => !r.isFork).length / Math.max(repos.length, 1);
    const originalityScore = Math.min(40, nonForkRatio * 40);

    const score = securityScore + privateScore + originalityScore;
    
    if (avgSecurity > 60) details.push('Security-conscious coding practices');
    
    return { score: Math.min(100, score), weight: this.WEIGHTS.security, details };
  }

  private determineLevel(score: number): 'JUNIOR' | 'MID' | 'SENIOR' | 'STAFF' {
    if (score >= 85) return 'STAFF';
    if (score >= 70) return 'SENIOR';
    if (score >= 50) return 'MID';
    return 'JUNIOR';
  }

  private estimatePercentile(score: number): number {
    if (score >= 90) return 98;
    if (score >= 85) return 95;
    if (score >= 75) return 85;
    if (score >= 65) return 70;
    if (score >= 55) return 55;
    if (score >= 45) return 40;
    return 25;
  }

  private async saveScore(userId: string, data: {
    overall: number;
    codeQuality: number;
    projectDepth: number;
    consistency: number;
    uiUx: number;
    security: number;
    level: string;
    percentile: number;
  }) {
    const existing = await prisma.score.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const scoreData = {
      composite: data.overall,
      codeQuality: data.codeQuality,
      projectDepth: data.projectDepth,
      consistency: data.consistency,
      uiUx: data.uiUx,
      security: data.security,
      level: data.level,
      percentile: data.percentile,
    };

    if (existing) {
      return prisma.score.update({
        where: { id: existing.id },
        data: scoreData,
      });
    }

    return prisma.score.create({
      data: { userId, ...scoreData },
    });
  }
}

export const scoringEngine = new ScoringEngine();
