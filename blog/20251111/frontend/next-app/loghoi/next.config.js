/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Kubernetes本番ビルド時にESLintチェックをスキップ
    // 開発時は通常通りESLintが動作します
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScriptエラーは検出する（型安全性を保つ）
    ignoreBuildErrors: false,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    })
    return config
  },
}

module.exports = nextConfig
