using CiviLanka.API.Models;
using Xunit;

namespace CiviLanka.API.Tests
{
    public class WorkOrderStatusTransitionTests
    {
        [Theory]
        [InlineData(WorkOrderStatus.AiGenerated, WorkOrderStatus.PendingApproval)]
        [InlineData(WorkOrderStatus.AiGenerated, WorkOrderStatus.Approved)]
        [InlineData(WorkOrderStatus.AiGenerated, WorkOrderStatus.Assigned)]
        [InlineData(WorkOrderStatus.AiGenerated, WorkOrderStatus.Rejected)]
        [InlineData(WorkOrderStatus.AiGenerated, WorkOrderStatus.Cancelled)]
        [InlineData(WorkOrderStatus.PendingApproval, WorkOrderStatus.Approved)]
        [InlineData(WorkOrderStatus.PendingApproval, WorkOrderStatus.Rejected)]
        [InlineData(WorkOrderStatus.PendingApproval, WorkOrderStatus.Cancelled)]
        [InlineData(WorkOrderStatus.Approved, WorkOrderStatus.Assigned)]
        [InlineData(WorkOrderStatus.Approved, WorkOrderStatus.Scheduled)]
        [InlineData(WorkOrderStatus.Approved, WorkOrderStatus.Cancelled)]
        [InlineData(WorkOrderStatus.Assigned, WorkOrderStatus.Scheduled)]
        [InlineData(WorkOrderStatus.Assigned, WorkOrderStatus.InProgress)]
        [InlineData(WorkOrderStatus.Assigned, WorkOrderStatus.Cancelled)]
        [InlineData(WorkOrderStatus.Scheduled, WorkOrderStatus.InProgress)]
        [InlineData(WorkOrderStatus.Scheduled, WorkOrderStatus.Cancelled)]
        [InlineData(WorkOrderStatus.InProgress, WorkOrderStatus.Completed)]
        [InlineData(WorkOrderStatus.InProgress, WorkOrderStatus.Cancelled)]
        [InlineData(WorkOrderStatus.Completed, WorkOrderStatus.Verified)]
        [InlineData(WorkOrderStatus.Completed, WorkOrderStatus.Closed)]
        [InlineData(WorkOrderStatus.Completed, WorkOrderStatus.Cancelled)]
        [InlineData(WorkOrderStatus.Verified, WorkOrderStatus.Closed)]
        [InlineData(WorkOrderStatus.Rejected, WorkOrderStatus.Cancelled)]
        public void CanTransition_ValidTransitions_ReturnsTrue(string current, string target)
        {
            var result = WorkOrderStatus.CanTransition(current, target);
            Assert.True(result, $"Expected transition from '{current}' to '{target}' to be valid.");
        }

        [Theory]
        [InlineData(WorkOrderStatus.AiGenerated, WorkOrderStatus.Completed)]
        [InlineData(WorkOrderStatus.AiGenerated, WorkOrderStatus.Verified)]
        [InlineData(WorkOrderStatus.AiGenerated, WorkOrderStatus.Closed)]
        [InlineData(WorkOrderStatus.PendingApproval, WorkOrderStatus.InProgress)]
        [InlineData(WorkOrderStatus.PendingApproval, WorkOrderStatus.Completed)]
        [InlineData(WorkOrderStatus.InProgress, WorkOrderStatus.PendingApproval)]
        [InlineData(WorkOrderStatus.Completed, WorkOrderStatus.InProgress)]
        [InlineData(WorkOrderStatus.Closed, WorkOrderStatus.InProgress)]
        [InlineData(WorkOrderStatus.Closed, WorkOrderStatus.Cancelled)]
        [InlineData(WorkOrderStatus.Cancelled, WorkOrderStatus.Approved)]
        [InlineData(WorkOrderStatus.Cancelled, WorkOrderStatus.AiGenerated)]
        [InlineData(WorkOrderStatus.Rejected, WorkOrderStatus.Approved)]
        public void CanTransition_InvalidTransitions_ReturnsFalse(string current, string target)
        {
            var result = WorkOrderStatus.CanTransition(current, target);
            Assert.False(result, $"Expected transition from '{current}' to '{target}' to be invalid.");
        }

        [Fact]
        public void CanTransition_SameStatus_ReturnsTrue()
        {
            foreach (var status in WorkOrderStatus.All)
            {
                Assert.True(WorkOrderStatus.CanTransition(status, status), $"Same-status transition for '{status}' should be valid.");
            }
        }

        [Fact]
        public void GetAllowedNextStatuses_TerminalStates_ReturnsEmpty()
        {
            var closedNext = WorkOrderStatus.GetAllowedNextStatuses(WorkOrderStatus.Closed);
            var cancelledNext = WorkOrderStatus.GetAllowedNextStatuses(WorkOrderStatus.Cancelled);

            Assert.Empty(closedNext);
            Assert.Empty(cancelledNext);
        }
    }
}
