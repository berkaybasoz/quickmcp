import { Constant, TokenMode } from '../constant/constant';

export class DeploymentUtil {
  private readonly deployMode: string;
  private readonly tokenMode: TokenMode;

  constructor(rawDeployMode: string, rawTokenMode?: string) {
    this.deployMode = this.normalizeDeployMode(rawDeployMode);
    this.tokenMode = this.resolveTokenMode(rawTokenMode);
  }

  static fromRuntime(rawDeployMode?: string, rawTokenMode?: string): DeploymentUtil {
    return new DeploymentUtil(
      String(rawDeployMode || process.env.DEPLOY_MODE || ''),
      rawTokenMode || process.env.QUICKMCP_TOKEN_MODE
    );
  }

  normalizeDeployMode(raw: string): string {
    const normalized = String(raw || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    if (normalized === 'SAAS') return 'SAAS';
    if (normalized === 'ONPREM') return 'ONPREM';
    return normalized;
  }

  resolveTokenMode(rawMode: string | undefined): TokenMode {
    const mode = String(rawMode || '').trim().toUpperCase();
    if (mode === Constant.TokenMode.RSA) return Constant.TokenMode.RSA;
    if (mode === Constant.TokenMode.LOCAL) return Constant.TokenMode.LOCAL;
    return this.isSaasMode() ? Constant.TokenMode.RSA : Constant.TokenMode.LOCAL;
  }

  isSaasMode(): boolean {
    return this.deployMode === 'SAAS';
  }

  tokenModeIsLocal(): boolean {
    return this.tokenMode === Constant.TokenMode.LOCAL;
  }

  authModeIsNone(authMode: string | undefined): boolean {
    return String(authMode || '').trim().toUpperCase() === Constant.AuthMode.NONE;
  }

}
