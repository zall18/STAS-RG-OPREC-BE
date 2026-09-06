import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { UpdateRecruitmentSettingInput } from '../schemas/setting.schema';

const DEFAULT_SETTING_KEY = 'DEFAULT';

export class SettingService {
  /**
   * Get current recruitment settings (creates default if not yet seeded)
   */
  static async getSetting() {
    let setting = await prisma.recruitmentSetting.findUnique({
      where: { key: DEFAULT_SETTING_KEY },
    });

    if (!setting) {
      setting = await prisma.recruitmentSetting.create({
        data: {
          key: DEFAULT_SETTING_KEY,
          isActive: env.OPREC_IS_ACTIVE,
          currentBatch: env.CURRENT_OPREC_BATCH,
          description: 'Pengaturan periode rekrutmen default STAS-RG',
        },
      });
    }

    return setting;
  }

  /**
   * Update recruitment settings
   */
  static async updateSetting(input: UpdateRecruitmentSettingInput) {
    const setting = await prisma.recruitmentSetting.upsert({
      where: { key: DEFAULT_SETTING_KEY },
      update: {
        isActive: input.isActive,
        currentBatch: input.currentBatch,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        description: input.description ?? null,
      },
      create: {
        key: DEFAULT_SETTING_KEY,
        isActive: input.isActive,
        currentBatch: input.currentBatch,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        description: input.description ?? null,
      },
    });

    return setting;
  }

  /**
   * Check if Oprec is currently active
   */
  static async isOprecActive(): Promise<boolean> {
    const setting = await this.getSetting();
    return setting.isActive;
  }

  /**
   * Get currently active batch name
   */
  static async getCurrentBatch(): Promise<string> {
    const setting = await this.getSetting();
    return setting.currentBatch;
  }
}
