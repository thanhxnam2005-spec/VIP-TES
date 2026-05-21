import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Check, X, Loader2 } from 'lucide-react';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinningIcon = styled.span`
  display: flex;
  animation: ${spin} 1s linear infinite;
`;

const StatusWrapper = styled.span`
  display: flex;
  margin-right: 6px;
`;

function Status({ isDownloading, isCached }) {
  if (isDownloading) {
    return (
      <StatusWrapper>
        <SpinningIcon>
          <Loader2 size={18} />
        </SpinningIcon>
      </StatusWrapper>
    );
  }

  if (isCached) {
    return (
      <StatusWrapper>
        <Check size={18} color="var(--accent-color)" />
      </StatusWrapper>
    );
  }

  return (
    <StatusWrapper>
      <X size={18} color="var(--text-color-secondary)" />
    </StatusWrapper>
  );
}

export default Status;
