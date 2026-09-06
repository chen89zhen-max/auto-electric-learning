/**
 * High-Precision Matrix Utilities and Linear System Solver
 * Pure TypeScript implementation with Partial Pivoting Gaussian Elimination
 * Used for DC Modified Nodal Analysis (MNA)
 */

export class Matrix {
  /**
   * Solves the linear system A * x = b using Gaussian elimination with partial pivoting.
   * A is an N x N matrix (represented as number[][]), b is an N-element vector.
   * Returns x (solution vector) or null if the system is singular or degenerate.
   */
  public static solveLinearSystem(A: number[][], b: number[], tolerance = 1e-12): number[] | null {
    const n = A.length;
    if (n === 0 || b.length !== n) return null;

    // Clone A and b to avoid mutating input data
    const M: number[][] = A.map((row) => row.slice());
    const rhs: number[] = b.slice();

    // Forward elimination with partial pivoting
    for (let k = 0; k < n; k++) {
      // Find pivot row
      let maxVal = Math.abs(M[k][k]);
      let maxRow = k;
      for (let i = k + 1; i < n; i++) {
        const val = Math.abs(M[i][k]);
        if (val > maxVal) {
          maxVal = val;
          maxRow = i;
        }
      }

      // Check for singularity
      if (maxVal < tolerance) {
        return null; // Singular or indeterminate
      }

      // Swap rows if needed
      if (maxRow !== k) {
        const tempRow = M[k];
        M[k] = M[maxRow];
        M[maxRow] = tempRow;

        const tempRhs = rhs[k];
        rhs[k] = rhs[maxRow];
        rhs[maxRow] = tempRhs;
      }

      // Eliminate rows below pivot
      const pivot = M[k][k];
      for (let i = k + 1; i < n; i++) {
        const factor = M[i][k] / pivot;
        M[i][k] = 0;
        for (let j = k + 1; j < n; j++) {
          M[i][j] -= factor * M[k][j];
        }
        rhs[i] -= factor * rhs[k];
      }
    }

    // Back substitution
    const x = Array.from({ length: n }, () => 0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = rhs[i];
      for (let j = i + 1; j < n; j++) {
        sum -= M[i][j] * x[j];
      }
      x[i] = sum / M[i][i];
    }

    return x;
  }
}
