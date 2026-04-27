#!/bin/bash

echo "果冻大作战：疯狂搬运工 - 启动脚本"
echo "=================================================="

# 检查node_modules是否存在
if [ ! -d "node_modules" ]; then
    echo "❌ 依赖未安装，正在安装..."
    pnpm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败，请检查网络连接或手动运行: pnpm install"
        exit 1
    fi
    echo "✅ 依赖安装完成"
fi

echo ""
echo "请选择启动模式："
echo "1) 开发模式 (npm run dev)"
echo "2) 构建生产版本 (npm run build)"
echo "3) 预览生产版本 (npm run preview)"
echo "q) 退出"

read -p "请输入选项 [1-3 or q]: " option

case $option in
    1)
        echo "🚀 启动开发服务器..."
        npm run dev
        ;;
    2)
        echo "📦 构建生产版本..."
        npm run build
        echo "✅ 构建完成，输出目录: /dist"
        ;;
    3)
        echo "👁 预览生产版本..."
        npm run preview
        ;;
    q|Q)
        echo "再见！"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac
