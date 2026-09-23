using CiviLanka.API.Models;
using Xunit;

namespace CiviLanka.API.Tests
{
    public class MaintenanceStatusTransitionTests
    {
        [Theory]
        [InlineData(MaintenanceStatus.Pending, MaintenanceStatus.Assigned)]
        [InlineData(MaintenanceStatus.Pending, MaintenanceStatus.Cancelled)]
        [InlineData(MaintenanceStatus.Assigned, MaintenanceStatus.InProgress)]
        [InlineData(MaintenanceStatus.Assigned, MaintenanceStatus.Cancelled)]
        [InlineData(MaintenanceStatus.InProgress, MaintenanceStatus.Completed)]
        [InlineData(MaintenanceStatus.InProgress, MaintenanceStatus.Cancelled)]
        [InlineData(MaintenanceStatus.Completed, MaintenanceStatus.VerificationPending)]
        [InlineData(MaintenanceStatus.Completed, MaintenanceStatus.Cancelled)]
        [InlineData(MaintenanceStatus.VerificationPending, MaintenanceStatus.Verified)]
        [InlineData(MaintenanceStatus.VerificationPending, MaintenanceStatus.RequiresCorrection)]
        [InlineData(MaintenanceStatus.VerificationPending, MaintenanceStatus.Cancelled)]
        [InlineData(MaintenanceStatus.RequiresCorrection, MaintenanceStatus.InProgress)]
        [InlineData(MaintenanceStatus.RequiresCorrection, MaintenanceStatus.Cancelled)]
        public void CanTransition_ValidTransitions_ReturnsTrue(string current, string target)
        {
            var result = MaintenanceStatus.CanTransition(current, target);
            Assert.True(result, $"Expected transition from '{current}' to '{target}' to be valid.");
        }

        [Theory]
        [InlineData(MaintenanceStatus.Pending, MaintenanceStatus.Verified)]
        [InlineData(MaintenanceStatus.Pending, MaintenanceStatus.Completed)]
        [InlineData(MaintenanceStatus.Assigned, MaintenanceStatus.Completed)]
        [InlineData(MaintenanceStatus.Assigned, MaintenanceStatus.Verified)]
        [InlineData(MaintenanceStatus.InProgress, MaintenanceStatus.Verified)]
        [InlineData(MaintenanceStatus.Completed, MaintenanceStatus.Verified)]
        [InlineData(MaintenanceStatus.Verified, MaintenanceStatus.InProgress)]
        [InlineData(MaintenanceStatus.Verified, MaintenanceStatus.Cancelled)]
        [InlineData(MaintenanceStatus.Cancelled, MaintenanceStatus.Assigned)]
        [InlineData(MaintenanceStatus.Cancelled, MaintenanceStatus.Verified)]
        public void CanTransition_InvalidTransitions_ReturnsFalse(string current, string target)
        {
            var result = MaintenanceStatus.CanTransition(current, target);
            Assert.False(result, $"Expected transition from '{current}' to '{target}' to be invalid.");
        }

        [Fact]
        public void CanTransition_SameStatus_ReturnsTrue()
        {
            foreach (var status in MaintenanceStatus.All)
            {
                Assert.True(MaintenanceStatus.CanTransition(status, status), $"Same-status transition for '{status}' should be valid.");
            }
        }

        [Fact]
        public void GetAllowedNextStatuses_TerminalStates_ReturnsEmpty()
        {
            var verifiedNext = MaintenanceStatus.GetAllowedNextStatuses(MaintenanceStatus.Verified);
            var cancelledNext = MaintenanceStatus.GetAllowedNextStatuses(MaintenanceStatus.Cancelled);

            Assert.Empty(verifiedNext);
            Assert.Empty(cancelledNext);
        }
    }
}
