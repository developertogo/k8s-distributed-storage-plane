#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " k8s-distributed-storage-plane: Comprehensive Test Suite"
echo "=========================================================="

echo ">> 1. Running Backend & Systems Unit Tests (CSI, API, Workflows, DB, Operator)..."
cd server
npm test
cd ..

echo ""
echo ">> 2. Running Python Storage Math & Benchmark Unit Tests..."
python3 scripts/test_scripts.py

echo ""
echo ">> 3. Running Frontend React & UI Unit Tests..."
cd client
npm test -- --watchAll=false
cd ..

echo ""
echo ">> All Comprehensive Unit Tests Passed Successfully!"
